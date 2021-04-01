import { DBConnect } from "./db-connect"
import { Hash } from "./hash"

/**
 * Profile
 * 
 * ユーザプロフィールデータを扱う
 * データベース取得・更新を行う
 * ユーザプロフィールデータの操作を行う度にインスタンス化して使用する
 */
export class Profile {
    /** ログインしているユーザのEmailを格納 */
    public login_email: string

    /**
     * メインコンストラクタ
     * @param login_email ログインしているユーザのEmail
     */
    constructor(login_email: string) {
        this.login_email = login_email
    }

    /**
     * 変更があったプロフィールデータをデータベース更新する
     * @param name 
     * @returns 更新されたかどうかのboolean値
     */
    public async setInfo(name: string) {
        /* データベース取得 */
        const snapshot = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).where("email", "==", this.login_email).get()
        const doc = snapshot.docs[0]
        const userRef = DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(doc.id)

        /* Name */
        /* データベース更新 */
        try {
            await userRef.update({name: name})
        } catch (error) {
            console.log(error)
            return false
        }

        return true
    }

    /**
     * 変更があったプロフィールデータ(認証に関わるセキュア情報)をデータベース更新する
     * 更新が完了したら現在のセッションを破棄して改めてログインする必要がある
     * @param email 
     * @param newpassword 
     * @param newpassword_check 
     * @returns 更新されたかどうかのboolean値
     */
    public async setSecureInfo(email: string, newpassword: string, newpassword_check: string) {
        /* データベース取得 */
        const snapshot = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).where("email", "==", this.login_email).get()
        const doc = snapshot.docs[0]
        const userRef = DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(doc.id)

        /* 変更があった場合trueにするフラグ */
        var change_flg: boolean = false
        
        /* Email */
        if (email !== "") {
            var regex = /^[A-Za-z0-9]{1}[A-Za-z0-9_.-]*@{1}[A-Za-z0-9_.-]{1,}\.[A-Za-z0-9]{1,}$/
            if (regex.test(email)) {
                /* 正規表現に一致する場合 */
                const checksnapshot = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).where("email", "==", email).get()
                if (checksnapshot.empty) {
                    /* データが一意である場合 */

                    /* データベース更新 */
                    await userRef.update({email: email})
                    change_flg = true
                }
            }
        }

        /* Password */
        if (newpassword !== "" && newpassword_check !== "" && newpassword === newpassword_check) {
            if (newpassword.length >= 6) {
                /* 文字数が規定範囲内の場合 */

                /* パスワードのハッシュ化 */
                const hashed_password = Hash.bcrypt.hashSync(newpassword, Hash.SALTROUNDS)

                /* データベース更新 */
                await userRef.update({password: hashed_password})
                change_flg = true
            }
        }

        return change_flg
    }

    /**
     * 指定されたユーザの名前を取得
     * @param userId 対象ユーザID
     * @returns ユーザ名
     */
    public static async getUserName(userId: string) {
        var name: null | string = null

        const user_doc = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(userId).get()
        const data = user_doc.data()
        if (data !== undefined) {
            name = data.name
        }

        return name
    }

    /**
     * 指定されたユーザが存在するかどうか判定
     * @param userId 対象ユーザID
     * @returns 真偽値
     */
    public static async isExists(userId: string) {
        const user_doc = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).doc(userId).get()
        return user_doc.exists
    }
}