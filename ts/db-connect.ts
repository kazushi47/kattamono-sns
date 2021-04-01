import { Firestore } from "@google-cloud/firestore"

/**
 * DBConnect
 * 
 * データベース接続用
 * ドキュメント型データベースであるFirestoreに接続するためのロジックを保持する
 * インスタンス化する必要はなく、静的に使用できる
 */
export class DBConnect {
    /** ユーザコレクションのコレクション名 */
    public static readonly USERS_COLLECTION = "users"
    /** Post(投稿)コレクションのコレクション名 */
    public static readonly POSTS_COLLECTION = "posts"

    /** Firestoreインスタンス */
    public static readonly db = new Firestore({
        projectId: "lesson01-282507",
        keyFilename: "<your key's path here!>.json",
    })

    /**
     * 指定されたコレクションを取得
     * @param name コレクション名
     */
    public static getCollection(name: string) {
        return this.db.collection(name)
    }
}