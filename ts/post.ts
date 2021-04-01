import { FieldPath, FieldValue } from "@google-cloud/firestore"
import { DBConnect } from "./db-connect"
import { Favorite } from "./favorite"
import { FileStorage } from "./file-storage"
import { Profile } from "./profile"

/**
 * Post
 * 
 * Post(投稿)に関わる処理
 */
export class Post {
    /** ユーザID */
    private id: string
    
    /**
     * メインコンストラクタ
     * @param id ユーザID
     */
    constructor(id: string) {
        this.id = id
    }
    
    /**
     * 投稿処理。
     * データベースに投稿データを登録し、ストレージにマルチデータを保存する。
     * 投稿処理がすべて完了すると真を返却。
     * @param data 投稿データ
     * @param multidata 投稿データ(マルチデータ)
     * @returns 投稿処理が正常にできたかどうか真偽値
     */
    public async add(data: any, multidata: any) {
        /* 真偽値返却用addflg */
        var addflg = false
        
        /* データの値チェック */
        if (!this.addDataChecker(data, multidata)) {
            /* データの値が不正の場合 */
            return false
        }
        
        /* docに登録用データを格納 */
        var doc: any = {}
        doc.user_id = this.id
        doc.timestamp = FieldValue.serverTimestamp()
        doc.favorities = []
        doc.title = data.title
        if (data.description !== "") {
            /* descriptionは空文字でない場合のみ登録 */
            doc.description = data.description
        }
        
        /* 作成されたドキュメントのID格納用 */
        var post_id: any = ""

        /* docに格納したデータをデータベースに登録 */
        await this.add_database(doc).then(doc_id => {
            post_id = doc_id
        }).catch(reason => {
            /* データベース登録エラー */
            console.log(reason)
            addflg = false
        })
        
        if (data.picture_originalname !== "" && multidata != null) {
            /* マルチデータ(画像データ)が存在する場合 */
            /* FileStorageインスタンス */
            var fileStorage = new FileStorage(this.id, post_id, data.picture_originalname)
            
            /* 画像ファイルをファイルストレージにアップロード */
            await fileStorage.upload(multidata).then(async storage_flg => {
                if (storage_flg) {
                    await this.update(post_id, {picture_name: data.picture_originalname}).then(database_flg => {
                        if (database_flg) {
                            addflg = true
                        } else {
                            /* データベース更新エラー */
                            console.log("database update error!")
                            addflg = false
                        }
                    }).catch(reason => {
                        /* データベース更新エラー */
                        console.log(reason)
                        addflg = false
                    })
                } else {
                    /* ファイルストレージエラー */
                    console.log("file storage error!")
                    addflg = false
                }
            }).catch(reason => {
                /* ファイルストレージエラー */
                console.log(reason)
                addflg = false
            })
        } else {
            /* マルチデータ(画像データ)が存在しない場合 */
            addflg = true
        }
        return addflg
    }

    /**
     * 対象のPostを削除
     * @param target_postid 削除対象PostのドキュメントID
     * @returns 削除処理の真偽値
     */
    public async remove(target_postid: string) {
        var flg = false

        await this.removedataChecker(target_postid).then(async check => {
            if (check) {
                try {
                    /* データベースから削除 */
                    await DBConnect.getCollection(DBConnect.POSTS_COLLECTION).doc(target_postid).delete()
                    flg = true
                } catch (error) {
                    console.log(error)
                }
            }
        }).catch(reason => {
            console.log(reason)
        })

        return flg
    }

    /**
     * Postをリストで取得
     * @param login_user_id ログイン状態ならばログインユーザID(省略可)
     * @returns Postのリスト
     */
    public static async getPosts(login_user_id?: string) {
        /* 返却値posts_list */
        var posts_list: any[] = []

        var news_res: Promise<void | any[]>
        var followers_res: Promise<void | any[]> | any
        var mines_res: Promise<void | any[]>

        /* 取得する数の上限値 */
        const all_upper = 30
        var follows_upper: number = 0
        var mines_upper: number = 3

        if (login_user_id !== undefined) {
            /* ログイン状態の場合 */
            mines_upper = 3
            follows_upper = 20

            /* 自身の投稿を取得 */
            mines_res = this.getUserPosts([login_user_id], login_user_id).then(result => {
                posts_list = posts_list.concat(result.slice(0, mines_upper))
            })

            /* フォローしているユーザの投稿を取得 */
            try {
                const login_user_doc = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(login_user_id).get()
                const login_user_data: any = login_user_doc.data()
                followers_res = this.getUserPosts(login_user_data.follows, login_user_id).then(result => {
                    posts_list = posts_list.concat(result.slice(0, follows_upper))
                })
            } catch (error) {
                console.log(error)
            }

            /* 最新の投稿を取得 */
            news_res = this.getUserPosts(undefined, login_user_id).then(result => {
                result = result.slice(0, all_upper - mines_upper - follows_upper)
                posts_list = posts_list.concat(result)
            })

            await Promise.all([mines_res, followers_res, news_res])

            for (var i = 0; i < posts_list.length; i++) {
                for (var j = 0; i < posts_list.length; j++) {
                    try {
                        if (i != j && posts_list[i].id == posts_list[j].id) {
                            /* 重複するものは削除 */
                            posts_list.splice(j, 1)
                            break
                        }
                    } catch (error) {
                        break
                    }
                }
                if (i >= posts_list.length) {
                    break
                }
            }
        } else {
            /* ログイン状態でない場合、最新の投稿のみ取得 */
            await this.getUserPosts().then(result => {
                posts_list = posts_list.concat(result.slice(0, all_upper))
            })
        }

        return posts_list
    }

    /**
     * ユーザIDをもとにユーザのPostをリストで取得
     * @param user_ids 指定ユーザID
     * @param login_user_id ログイン状態ならばログインユーザID(省略可)
     * @returns Postのリスト
     */
    public static async getUserPosts(user_ids?: string[], login_user_id?: string) {
        if (user_ids !== undefined && user_ids.length == 0) {
            return []
        }

        /* 指定ユーザの投稿リスト取得 */
        var post_docs: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
        var posts_res: Promise<void> | any
        if (user_ids !== undefined) {
            posts_res = DBConnect.getCollection(DBConnect.POSTS_COLLECTION).where("user_id", "in", user_ids).get().then(result => {
                post_docs = result
            })
        } else {
            posts_res = DBConnect.getCollection(DBConnect.POSTS_COLLECTION).get().then(result => {
                post_docs = result
            })
        }

        /* ログイン状態時のみログインユーザのfavoritiesを取得 */
        var user_favorities: string[]
        var favorities_res: null | Promise<void | string[] | undefined> = null
        if (login_user_id !== undefined) {
            favorities_res = new Favorite(login_user_id).getFavorities().then(result => {
                if (result !== undefined) {
                    user_favorities = result
                }
            })
        }

        /* 返却値listの設定 */
        var list: any[] = []
        await Promise.all([posts_res, favorities_res]).then(result => {
            post_docs.forEach(post_doc => {
                var post_data = post_doc.data()
                var post: any = {}
                post.id = post_doc.id
                post.timestamp = post_data.timestamp
                post.user_id = post_data.user_id
                post.favorities = post_data.favorities
                post.title = post_data.title
                if ("description" in post_data) {
                    post.description = post_data.description
                }
                if ("picture_name" in post_data) {
                    post.picture_url = new FileStorage(post.user_id, post.id, post_data.picture_name).getUrl()
                }
                if (login_user_id !== undefined) {
                    post.isFavoriting = user_favorities.includes(post.id)
                }
                if(login_user_id !== undefined && login_user_id == post.user_id) {
                    post.isMine = true
                } else {
                    post.isMine = false
                }
                list.push(post)
            })
        })

        for (var i = 0; i < list.length; i++) {
            list[i].user_name = await Profile.getUserName(list[i].user_id)
        }

        return list
    }

    /**
     * ユーザIDをもとにユーザのお気に入りPostをリストで取得
     * @param user_id 指定ユーザID
     * @param login_user_id ログイン状態ならばログインユーザID(省略可)
     * @returns お気に入りPostのリスト
     */
    public static async getFavoritePosts(user_id: string, login_user_id?: string) {
        /* 返却値listの設定 */
        var list: any[] = []

        /* 指定ユーザのfavoritiesを取得 */
        var favorities: string[] = []
        await new Favorite(user_id).getFavorities().then(result => {
            if (result !== undefined) {
                favorities = result
            }
        })

        if (favorities.length != 0) {
            /* favoritiesをもとにPostのリストを取得 */
            var post_docs: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
            const post_res = DBConnect.getCollection(DBConnect.POSTS_COLLECTION).where(FieldPath.documentId(), 'in', favorities).get().then(result => {
                post_docs = result
            })
    
            /* ログイン状態時のみログインユーザのfavoritiesを取得 */
            var login_user_favorities: string[]
            var login_user_favorities_res: null | Promise<void | string[] | undefined> = null
            if (login_user_id !== undefined) {
                login_user_favorities_res = new Favorite(login_user_id).getFavorities().then(result => {
                    if (result !== undefined) {
                        login_user_favorities = result
                    }
                })
            }
    
            await Promise.all([post_res, login_user_favorities_res]).then(result => {
                post_docs.forEach(post_doc => {
                    var post: any = {}
                    const post_data = post_doc.data()
                    post.id = post_doc.id
                    post.timestamp = post_data.timestamp
                    post.user_id = post_data.user_id
                    post.favorities = post_data.favorities
                    post.title = post_data.title
                    if ("description" in post_data) {
                        post.description = post_data.description
                    }
                    if ("picture_name" in post_data) {
                        post.picture_url = new FileStorage(post.user_id, post.id, post_data.picture_name).getUrl()
                    }
                    if (login_user_id !== undefined) {
                        post.isFavoriting = login_user_favorities.includes(post.id)
                    }
                    if(login_user_id !== undefined && login_user_id == post.user_id) {
                        post.isMine = true
                    } else {
                        post.isMine = false
                    }
                    list.push(post)
                })
            })
    
            for (var i = 0; i < list.length; i++) {
                list[i].user_name = await Profile.getUserName(list[i].user_id)
            }
        }

        return list
    }

    /**
     * 与えられたデータを検査
     * @param data 検査用データ
     * @param multidata 検査用マルチデータ
     * @returns 検査結果真偽値
     */
    private addDataChecker(data: any, multidata: any): boolean {
        if (data.title.length < 1 || data.title.length > 20) {
            /* title文字列の長さが規定範囲外 */
            return false
        }

        if (data.description.length > 200) {
            /* description文字列の長さが規定範囲外 */
            return false
        }

        return true
    }

    /**
     * 新規にデータベースにデータを登録
     * @param data 格納データ
     * @returns 作成されたドキュメントのID
     */
    private async add_database(data: any) {
        /* 返却するドキュメントID格納用 */
        var doc_id: string = ""

        try {
            await DBConnect.getCollection(DBConnect.POSTS_COLLECTION).add(data).then(post => {
                /* ドキュメントIDを格納 */
                doc_id = post.id
            })
        } catch (error) {
            /* データベース登録に失敗した場合 */
            console.log(error)
        }

        return doc_id
    }

    /**
     * 投稿POSTをチェックしデータベースのドキュメントを更新
     * @param id データベースの更新対象ドキュメントID
     * @param data 更新内容
     */
    private async update(id: any, data: any) {
        try {
            /* Postデータをデータベースに登録 */
            const postRef = DBConnect.db.collection(DBConnect.POSTS_COLLECTION).doc(id)
            await postRef.update(data)
            return true
        } catch (error) {
            console.log(error)
            return false
        }
    }

    private async removedataChecker(target_postid: string) {
        try {
            /* 対象ドキュメントの取得 */
            const doc = await DBConnect.getCollection(DBConnect.POSTS_COLLECTION).doc(target_postid).get()
                
            /* ドキュメントが存在しているかどうか */
            if (!doc.exists) {
                return false
            }
            
            /* ドキュメントデータ取得 */
            const data: any = doc.data()
            
            /* データは自身のものかどうか */
            if (data.user_id !== this.id) {
                return false
            }
    
            /* 画像データがある投稿かどうか */
            if ("picture_name" in data) {
                /* ストレージから画像データを削除 */
                var fileStorage = new FileStorage(this.id, target_postid, data.picture_name)
                fileStorage.remove().catch(console.error)
            }
        } catch (error) {
            console.log(error)
            return false
        }

        return true
    }
}