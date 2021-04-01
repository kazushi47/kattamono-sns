import { FieldValue } from "@google-cloud/firestore"
import { DBConnect } from "./db-connect"

/**
 * Favorite
 * 
 * 投稿に付けるfavoriteに関する処理
 * インスタンス化して使用する
 */
export class Favorite {
    /** ユーザID */
    private userId: string
    /** ユーザのドキュメント */
    private userRef: any

    /**
     * メインコンストラクタ
     * @param userId ユーザID
     */
    constructor(userId: string) {
        this.userId = userId
        this.userRef = DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(this.userId)
    }

    /**
     * 投稿にfavoriteを付ける
     * @param target_postid ターゲット投稿ID
     * @returns 処理結果真偽値
     */
    public async addFavorite(target_postid: string) {
        try {
            /* 自身のfavorities配列に追加 */
            await this.userRef.update({
                favorities: FieldValue.arrayUnion(target_postid)
            })

            /* ターゲットの投稿のfavorities配列に追加 */
            const target_postRef = DBConnect.getCollection(DBConnect.POSTS_COLLECTION).doc(target_postid)
            await target_postRef.update({
                favorities: FieldValue.arrayUnion(this.userId)
            })
        } catch (error) {
            console.log(error)
            return false
        }
        return true
    }

    /**
     * 投稿のfavoriteを取り消す
     * @param target_postid ターゲット投稿ID
     * @returns 処理結果真偽値
     */
    public async removeFavorite(target_postid: string) {
        try {
            /* 自身のfavorities配列から削除 */
            await this.userRef.update({
                favorities: FieldValue.arrayRemove(target_postid)
            })

            /* ターゲットの投稿のfavorities配列から削除 */
            const target_postRef = DBConnect.getCollection(DBConnect.POSTS_COLLECTION).doc(target_postid)
            await target_postRef.update({
                favorities: FieldValue.arrayRemove(this.userId)
            })
        } catch (error) {
            console.log(error)
            return false
        }
        return true
    }

    /**
     * 投稿をfavoriteしているかどうかチェック
     * @param target_postid ターゲット投稿ID
     * @returns 処理結果真偽値
     */
    public async isFavoriting(target_postid: string) {
        try {
            const doc = await this.userRef.get()
            const data: any = doc.data()

            return data.favorities.includes(target_postid)
        } catch (error) {
            console.log(error)
            return false
        }
    }

    /**
     * ユーザのfavoritiesを取得
     * @returns favorities
     */
    public async getFavorities() {
        try {
            const doc = await this.userRef.get()
            const data = doc.data()
            const favorities: string[] = data.favorities
            return favorities
        } catch (error) {
            console.log(error)
        }
    }
}