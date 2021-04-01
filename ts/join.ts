import { DBConnect } from "./db-connect"
import { Hash } from "./hash"

/**
 * Join
 * 
 * アカウント登録処理を行う
 * emailやpassword、password_checkerなどのパラメータを必要とする
 * アカウント登録処理ごとにインスタンス化する必要がある
 * entry()を呼び出してチェックからデータベース登録まで行う
 */
export class Join {
    /** POSTで受け取るパラメータを格納 */
    private email: string
    private password: string
    private password_checker: string

    /**
     * メインコンストラクタ
     * @param email POSTで受け取ったパラメータ
     * @param password POSTで受け取ったパラメータ
     * @param password_checker POSTで受け取ったパラメータ
     */
    constructor(email: string, password: string, password_checker: string) {
        this.email = email
        this.password = password
        this.password_checker = password_checker
    }

    /**
     * パラメータチェックからデータベース登録まで行う
     * @returns 登録完了できたかどうか
     */
    public async entry() {
        /* passwordとpassword_checkerが等しいか */
        if (this.password !== this.password_checker) {
            return false
        }

        /* emailの文字は正規表現にマッチするか */
        var regex = /^[A-Za-z0-9]{1}[A-Za-z0-9_.-]*@{1}[A-Za-z0-9_.-]{1,}\.[A-Za-z0-9]{1,}$/
        if (!regex.test(this.email)) {
            return false
        }

        /* passwordの文字列は規定以上か */
        if (this.password.length < 6) {
            return false
        }

        /* emailは未登録のものであるか */
        try {
            const snapshot = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).where("email", "==", this.email).get()
            if (!snapshot.empty) {
                return false
            }
        } catch (error) {
            return false
        }

        /* パスワードのハッシュ化 */
        const hashed_password = Hash.bcrypt.hashSync(this.password, Hash.SALTROUNDS)

        /* 新規アカウント情報をデータベースに登録する */
        try {
            await DBConnect.getCollection(DBConnect.USERS_COLLECTION).add({
                email: this.email,
                password: hashed_password,
                follows: [],
                followers: [],
                favorities: []
            })
            return true
        } catch (error) {
            return false
        }
    }
}