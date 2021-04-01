import express from "express"
import session from "express-session"
import multer from "multer"

import { Auth } from "./auth"
import { Join } from "./join"
import { Profile } from "./profile"
import { Post } from "./post"
import { Follow } from "./follow"
import { Favorite } from "./favorite"

/* Express */
const app = express()

/* viewsのejsとpublicのcssやjsなどを使用する設定 */
app.set("view engine", "ejs")
app.use(express.static("public"))

/* Expressでクライアントからデータを取得する設定 */
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/* Express-session */
app.use(session({
    secret: "abcdefghijklmn", // your secret here!
    resave: true,
    saveUninitialized: false
}))

/* Auth */
const auth = new Auth(app)

app.get("/", (req: any, res) => {
    if (req.isAuthenticated()) {
        Post.getPosts(req.user.id).then(result => {
            res.render("welcome_page", {login_email: req.user.email, posts: result})
        })
    } else {
        /* redirectToに遷移先を設定 */
        req.session.redirectTo = req.path

        Post.getPosts().then(result => {
            res.render("welcome_page", {login_email: null, posts: result})
        })
    }
})

app.get("/login", (req: any, res) => {
    if (req.isAuthenticated()) {
        res.redirect("/")
    } else {
        res.render("login_page")
    }
})

app.post("/login", auth.passport.authenticate("local", {
    failureRedirect: "/login"
}), (req: any, res) => {
    if (req.session.redirectTo) {
        res.redirect(req.session.redirectTo)
        delete req.session.redirectTo
    } else {
        res.redirect("/")
    }
})

app.post("/join", (req, res) => {
    var join = new Join(req.body.email, req.body.password, req.body.password_checker)
    join.entry().then(flg => {
        if (flg) {
            res.redirect(307, "/login")
        } else {
            res.redirect("/")
        }
    }).catch(reject => {
        console.log(reject)
        res.redirect("/")
    })
})

app.get("/profile", (req: any, res) => {
    if (req.isAuthenticated()) {
        res.redirect("/profile/" + req.user.id)
    } else {
        /* redirectToを設定しログイン画面へ遷移 */
        req.session.redirectTo = req.path
        res.redirect("/login")
    }
})

app.get("/profile/:userId", (req: any, res) => {
    Profile.isExists(req.params.userId).then(isExists => {
        if (isExists) {
            /* Promise */
            var p1: any = null
            var p2: any = null
            var p3: any = null
        
            /* 画面に渡すパラメータ格納用 */
            var params: any = {}
            params.id = req.params.userId
            params.login_email = null
            params.name = null
            params.isFollowing = null
            params.isMine = false
            
            /* ログインしている自分自身のプロフィールかどうかチェック */
            if (req.isAuthenticated()) {
                /* ログインしているためlogin_emailは設定しておく */
                params.login_email = req.user.email
        
                if (params.id === req.user.id) {
                    params.isMine = true
                    /* 自分自身のプロフィール画面用パラメータ */
                    params.name = req.user.name
                } else {
                    /* 自分以外のプロフィール画面用パラメータ */
                    p1 = Profile.getUserName(params.id).then(result => {
                        if (result !== null) {
                            params.name = result
                        }
                    })
        
                    /* フォローされているかどうかの真偽値を取得 */
                    p3 = new Follow(req.user.id).isFollowing(params.id).then(result => {
                        params.isFollowing = result
                    })
                }
            }
        
            /* Postのリストを取得 */
            if (req.isAuthenticated()) {
                p2 = Post.getUserPosts([params.id], req.user.id).then(list => {
                    params.posts = list
                })
            } else {
                p2 = Post.getUserPosts([params.id]).then(list => {
                    params.posts = list
                })
            }
            
            Promise.all([p1, p2, p3]).then(results => {
                /* redirectToに遷移先を設定 */
                req.session.redirectTo = req.path
        
                res.render("userprofile_page", params)
            }).catch(reject => {
                console.log(reject)
                res.redirect("back")
            })
        } else {
            res.redirect("back")
        }
    })
})

app.post("/edit-profile", (req: any, res) => {
    if (req.isAuthenticated()) {
        const name = req.body.name
        const email = req.body.email
        const newpassword = req.body.newpassword
        const newpassword_check = req.body.newpassword_check
        var profile = new Profile(req.user.email)
        profile.setInfo(name).then(change_flg => {
            if (change_flg) {
                /* 変更があったユーザ認証情報を更新 */
                req.user.name = name
            }
            profile.setSecureInfo(email, newpassword, newpassword_check).then(change_flg => {
                if (change_flg) {
                    req.logout()
                }
                res.redirect("/profile")
            })
        })
    } else {
        /* redirectToを削除しログイン画面へ遷移 */
        delete req.session.redirectTo
        res.redirect("/login")
    }
})

app.get("/followlist", (req: any, res) => {
    if (req.isAuthenticated()) {
        res.redirect("/followlist/" + req.user.id + "/follows")
    } else {
        /* redirectToを設定しログイン画面へ遷移 */
        req.session.redirectTo = req.path
        res.redirect("/login")
    }
})

app.get("/followlist/:userId/:type", (req: any, res) => {
    Profile.isExists(req.params.userId).then(isExists => {
        if (isExists) {
            /* Promises */
            var p1: any = null
            var p2: any = null
        
            /* 画面に渡すパラメータ格納用 */
            var params: any = {}
            params.id = req.params.userId
            params.name = null
            params.login_email = null
            params.type = req.params.type
            params.isMine = false
        
            /* ログインしている自分自身のプロフィールかどうかチェック */
            if (req.isAuthenticated()) {
                /* ログインしているためlogin_emailは設定しておく */
                params.login_email = req.user.email
        
                if (params.id === req.user.id) {
                    params.isMine = true
        
                    /* 自分自身のプロフィール画面用パラメータ */
                    params.name = req.user.name
                } else {
                    /* 自分以外のプロフィール画面用パラメータ */
                    p1 = Profile.getUserName(params.id).then(result => {
                        if (result !== null) {
                            params.name = result
                        }
                    })
                }
            }
        
            /* Followインスタンス */
            var follow: Follow
            if (req.isAuthenticated()) {
                follow = new Follow(req.user.id)
            } else {
                follow = new Follow()
            }
        
            if (params.type === "follows") {
                /* フォローリスト */
                p2 = follow.getFollows(params.id).then(results => {
                    if (results != null) {
                        params.followlist = results
                    } else {
                        console.log("getFollows fail")
                    }
                })
            } else if (params.type === "followers") {
                /* フォロワーリスト */
                p2 = follow.getFollowers(params.id).then(results => {
                    if (results != null) {
                        params.followlist = results
                    } else {
                        console.log("getFollowers fail")
                    }
                })
            } else {
                /* URLが異なっている場合は正しいURLでリダイレクト */
                res.redirect("/followlist/" + params.id + "/follows")
                return
            }
        
            Promise.all([p1, p2]).then(results => {
                /* redirectToに遷移先を設定 */
                req.session.redirectTo = req.path
        
                res.render("userfollowlist_page", params)
            }).catch(reject => {
                console.log(reject)
                res.redirect("back")
            })
        } else {
            res.redirect("back")
        }
    })
})

app.get("/favorities", (req: any, res) => {
    if (req.isAuthenticated()) {
        res.redirect("/favorities/" + req.user.id)
    } else {
        /* redirectToを設定しログイン画面へ遷移 */
        req.session.redirectTo = req.path
        res.redirect("/login")
    }
})

app.get("/favorities/:userId", (req: any, res) => {
    Profile.isExists(req.params.userId).then(isExists => {
        if (isExists) {
            var params: any = {}
            params.login_email = null
            params.id = req.params.userId
            params.name = null
            params.posts = null
            params.isMine = false
            
            const name_res: any = Profile.getUserName(params.id).then(result => {
                if (result !== null) {
                    params.name = result
                }
            })
        
            var posts_res: any
            if (req.isAuthenticated()) {
                params.login_email = req.user.email
                
                posts_res = Post.getFavoritePosts(params.id, req.user.id).then(result => {
                    params.posts = result
                })
            } else {
                posts_res = Post.getFavoritePosts(params.id).then(result => {
                    params.posts = result
                })
            }
        
            Promise.all([name_res, posts_res]).then(result => {
                /* redirectToに遷移先を設定 */
                req.session.redirectTo = req.path
                
                res.render("userfavorities_page", params)
            }).catch(reject => {
                console.log(reject)
                res.redirect("back")
            })
        } else {
            res.redirect("back")
        }
    })
})

app.post("/addpost", multer().single("picture"), (req: any, res) => {
    if (req.isAuthenticated()) {
        /* Postインスタンス */
        var post = new Post(req.user.id)

        /* POSTデータ */
        var data = {
            title: req.body.title,
            description: req.body.description,
            picture_originalname: ""
        }
        var multidata = null

        /* 画像ファイルがPOSTされているかどうか */
        if (req.file != null) {
            data.picture_originalname = req.file.originalname
            multidata = req.file.buffer
        }

        /* Postの投稿処理 */
        post.add(data, multidata).then(flg => {
            if (flg) {
                /* 正常に投稿された場合 */
                res.redirect("back")
            } else {
                /* 投稿処理エラー */
                console.log("post-add error!")
                res.redirect("back")
            }
        })
    } else {
        /* redirectToを削除しログイン画面へ遷移 */
        delete req.session.redirectTo
        res.redirect("/login")
    }
})

app.post("/removepost", (req: any, res) => {
    if (req.isAuthenticated()) {
        var post = new Post(req.user.id)
        post.remove(req.body.target_postid).then(flg => {
            if (flg) {
                res.redirect("back")                
            } else {
                console.log("delete-error!")
                res.redirect("back")
            }
        }).catch(console.error)
    } else {
        /* redirectToを削除しログイン画面へ遷移 */
        delete req.session.redirectTo
        res.redirect("/login")
    }
})

app.post("/follow", (req: any, res) => {
    if (req.isAuthenticated()) {
        const follow = new Follow(req.user.id)
        const targetUserId = req.body.targetUserId
        follow.isFollowing(targetUserId).then(isFollowing => {
            if (!isFollowing) {
                follow.doFollow(targetUserId).then(result => {
                    if (!result) {
                        console.log("follow fail")
                    }
                })
            }
        })
    } else {
        /* redirectToを削除しログイン画面へ遷移 */
        delete req.session.redirectTo
        res.redirect("/login")
    }
})

app.post("/unfollow", (req: any, res) => {
    if (req.isAuthenticated()) {
        const follow = new Follow(req.user.id)
        const targetUserId = req.body.targetUserId
        follow.isFollowing(targetUserId).then(isFollowing => {
            if (isFollowing) {
                follow.doUnfollow(targetUserId).then(result => {
                    if (!result) {
                        console.log("unfollow fail")
                    }
                })
            }
        })
    } else {
        /* redirectToを削除しログイン画面へ遷移 */
        delete req.session.redirectTo
        res.redirect("/login")
    }
})

app.post("/addfavorite", (req: any, res) => {
    if (req.isAuthenticated()) {
        const favorite = new Favorite(req.user.id)
        const target_postid = req.body.target_postid
        favorite.isFavoriting(target_postid).then(isFavoriting => {
            if (!isFavoriting) {
                favorite.addFavorite(target_postid).then(result => {
                    if (!result) {
                        console.log("addfavorite fail")
                    }
                })
            }
        })
    } else {
        /* redirectToを削除しログイン画面へ遷移 */
        delete req.session.redirectTo
        res.redirect("/login")
    }
})

app.post("/removefavorite", (req: any, res) => {
    if (req.isAuthenticated()) {
        const favorite = new Favorite(req.user.id)
        const target_postid = req.body.target_postid
        favorite.isFavoriting(target_postid).then(isFavoriting => {
            if (isFavoriting) {
                favorite.removeFavorite(target_postid).then(result => {
                    if (!result) {
                        console.log("removefavorite fail")
                    } else {
                        console.log("Remove favorite post: " + req.body.target_postid)
                    }
                })
            }
        })
    } else {
        /* redirectToを削除しログイン画面へ遷移 */
        delete req.session.redirectTo
        res.redirect("/login")
    }
})

app.get("/logout", (req: any, res) => {
    if (req.isAuthenticated()) {
        req.logout()
    }
    res.redirect("/")
})

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}/`)
})