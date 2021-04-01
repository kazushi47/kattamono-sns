import { DocumentReference, FieldValue } from "@google-cloud/firestore"
import { DBConnect } from "./db-connect"

/**
 * Follow
 * 
 * フォロー・フォロワーに関する処理
 * ログインしている場合はインスタンス化して使用する
 */
export class Follow {
    /** ログインユーザID */
    private loginUserId: string | undefined
    /** ユーザのドキュメント */
    private loginUserRef: DocumentReference<FirebaseFirestore.DocumentData> | undefined
    
    /**
     * メインコンストラクタ
     * @param loginUserId ログインユーザID
     */
    constructor(loginUserId?: string) {
        if (loginUserId !== undefined) {
            this.loginUserId = loginUserId
            this.loginUserRef = DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(this.loginUserId)
        }
    }

    /**
     * 指定したユーザをフォローする
     * @param targetUserId ターゲットユーザID
     * @returns 処理結果真偽値
     */
    public async doFollow(target_userId: string) {
        /* 返却用 */
        var flg: boolean = false

        /* ログインしている場合は両方undefinedではない */
        if (this.loginUserId !== undefined && this.loginUserRef !== undefined) {
            /* 自身のfollow配列に追加 */
            const follow_res: Promise<FirebaseFirestore.WriteResult> = this.loginUserRef.update({
                follows: FieldValue.arrayUnion(target_userId)
            })
    
            /* ターゲットのfollower配列に追加 */
            const target_userRef = DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(target_userId)
            const follower_res: Promise<FirebaseFirestore.WriteResult> = target_userRef.update({
                followers: FieldValue.arrayUnion(this.loginUserId)
            })
    
            await Promise.all([follow_res, follower_res]).then(result => {
                flg = true
            }).catch(reason => {
                console.log(reason)
            })
        }

        return flg
    }

    /**
     * 指定したユーザのフォローを解除する
     * @param target_userId ターゲットユーザID
     * @returns 処理結果真偽値
     */
    public async doUnfollow(target_userId: string) {
        /* 返却用 */
        var flg: boolean = false

        /* ログインしている場合は両方undefinedではない */
        if (this.loginUserId !== undefined && this.loginUserRef !== undefined) {
            /* 自身のfollow配列から削除 */
            const follow_res: Promise<FirebaseFirestore.WriteResult> = this.loginUserRef.update({
                follows: FieldValue.arrayRemove(target_userId)
            })
    
            /* ターゲットのfollower配列から削除 */
            const target_userRef = DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(target_userId)
            const follower_res: Promise<FirebaseFirestore.WriteResult> = target_userRef.update({
                followers: FieldValue.arrayRemove(this.loginUserId)
            })
    
            await Promise.all([follow_res, follower_res]).then(result => {
                flg = true
            }).catch(reason => {
                console.log(reason)
            })
        }

        return flg
    }

    /**
     * 指定したユーザをフォローしているかどうかをチェック
     * @param target_userId ターゲットユーザID
     * @returns 真偽値
     */
    public async isFollowing(target_userId: string) {
        /* 返却用 */
        var flg: boolean = false

        /* ログインしている場合は両方undefinedではない */
        if (this.loginUserId !== undefined && this.loginUserRef !== undefined) {
            try {
                const doc = await this.loginUserRef.get()
                const data = doc.data()
                
                /* followにターゲットユーザIDが含まれているかどうかの真偽値を返却 */
                if (data !== undefined) {
                    flg = data.follows.includes(target_userId)
                }
            } catch (error) {
                console.log(error)
            }
        }

        return flg
    }

    /**
     * フォローしているユーザの情報をリストで取得
     * @param userId 対象ユーザID
     * @returns フォローリスト
     */
    public async getFollows(userId: string) {
        try {
            const doc = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(userId).get()
            const data = doc.data()
            var follows: string[] = []
            if (data !== undefined) {
                follows = data.follows
            }
            
            var results: any[] = []
            for (var i = 0; i < follows.length; i++) {
                var result: any = {}
                const sub_doc = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(follows[i]).get()
                const sub_data: any = sub_doc.data()
                result.id = follows[i]
                result.name = sub_data.name
                /* ログインしている場合はisFollowingを設定(ログインユーザ自身を除く) */
                if (this.loginUserId !== undefined && follows[i] != this.loginUserId) {
                    result.isFollowing = await this.isFollowing(follows[i])
                }
                results.push(result)
            }
    
            return results
        } catch (error) {
            console.log(error)
            return null
        }
    }

    /**
     * フォロワーのユーザの情報をリストで取得
     * @returns フォロワーリスト
     */
    public async getFollowers(userId: string) {
        try {
            const doc = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(userId).get()
            const data = doc.data()
            var followers: string[] = []
            if (data !== undefined) {
                followers = data.followers
            }
    
            var results: any[] = []
            for (var i = 0; i < followers.length; i++) {
                var result: any = {}
                const sub_doc = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(followers[i]).get()
                const sub_data: any = sub_doc.data()
                result.id = followers[i]
                result.name = sub_data.name
                /* ログインしている場合はisFollowingを設定(ログインユーザ自身を除く) */
                if (this.loginUserId !== undefined && followers[i] != this.loginUserId) {
                    result.isFollowing = await this.isFollowing(followers[i])
                }
                results.push(result)
            }
    
            return results
        } catch (error) {
            console.log(error)
            return null
        }
    }
}