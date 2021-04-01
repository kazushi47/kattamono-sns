import { DBConnect } from "./db-connect"
import { Hash } from "./hash"

/**
 * Auth
 * 
 * Passportを使用してメールアドレス・パスワード認証を行う
 * 当クラスをインスタンス化して使用する
 */
export class Auth {
    /** Passport変数　ログイン機構に使用 */
    public passport = require("passport")

    /** strategy変数　ユーザID・パスワード認証モジュール */
    private LocalStrategy = require("passport-local").Strategy

    /**
     * メインコンストラクタ
     * 
     * Expressで使用するための設定やPassportの設定を行う
     * @param app Expressで発行されるapp変数
     */
    constructor(app: any) {
        /* appの設定 */
        app.use(this.passport.initialize())
        app.use(this.passport.session())

        /* 認証の設定 */
        this.passport.use(new this.LocalStrategy({
                /* 受け取るパラメータ名を指定 */
                usernameField: "email",
                passwordField: "password"
            }, async (email: string, password: string, done: any) => {
                /* id格納用 */
                var id: string

                /* name格納用 */
                var name: string

                /* データベースから認証情報を取得 */
                try {
                    const snapshot = await DBConnect.getCollection(DBConnect.USERS_COLLECTION).where("email", "==", email).get()
                    const doc = snapshot.docs[0]
                    const data = doc.data()

                    if (snapshot.empty) {
                        /* email fail */
                        return done(null, false)
                    }

                    if (!Hash.bcrypt.compareSync(password, data.password)) {
                        /* password fail */
                        return done(null, false)
                    }

                    /* get id */
                    id = doc.id

                    /* get name */
                    name = data.name
                } catch (error) {
                    /* error fail */
                    return done(null, false)
                }
                
                /* success */
                return done(null, { email: email, id: id, name: name })
            })
        )

        /* セッション用の設定 */
        this.passport.serializeUser((user: object, done: any) => {
            done(null, user)
        })
        this.passport.deserializeUser((user: object, done: any) => {
            done(null, user)
        })
    }
}