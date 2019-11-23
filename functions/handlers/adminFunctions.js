const {
    db,
    admin
} = require("../util/admin");
const config = require("../util/config");

exports.verifyPost = (req, res) => {
    let postData;

    db.doc(`/Posts/${req.params.postId}`).get().then(doc => {
            if (!doc.exists) {
                return res.status(404).json({
                    error: "Post not found"
                })
            }

            postData = doc.data();

            if (postData.verifed !== true) {
                postData.verifed = true;

                return db.doc(`/Posts/${req.params.postId}`).update({
                        verifed: postData.verifed
                    })
                    .then(() => {
                        return res.status(200).json({
                            message: "Verifed successfully"
                        })
                    })
            } else {
                return res.status(400).json({
                    error: "Post already verifed"
                })
            }

        })
        .catch(err => {
            console.error(err);
            return res.status(400).json({
                error: err.code
            });
        })


}

exports.addAdminPrivileges = (req, res) => {

    const email = req.body.body;

    admin.auth().getUserByEmail(email).then((user) => {

            if (user.admin === false) {
                return admin.auth().setCustomUserClaims(user.uid, {
                        user: true,
                        admin: true
                    })
                    .then(() => {
                        return res.json({
                            status: "User has admin privileges now"
                        })
                    })

            } else {
                return res.status(400).json({
                    error: "User is already an admin"
                })
            }

        })

        .catch(err => {
            console.error(err);
            if (
                err.code === "auth/wrong-password" ||
                err.code === "auth/user-not-found" ||
                err.code === "auth/invalid-email"
            ) {
                return res.status(403).json({
                    general: "Wrong email, please try again"
                });
            } else {
                return res.status(500).json({
                    error: err.code
                });
            }
        });
}