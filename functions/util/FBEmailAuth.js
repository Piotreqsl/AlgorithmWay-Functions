const {
    admin,
    db
} = require('./admin');


module.exports = (req, res, next) => {
    let idToken;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        idToken = req.headers.authorization.split("Bearer ")[1];
    } else {
        console.error("No token found");
        return res.status(403).json({
            error: "Unauthorized"
        });
    }

    admin
        .auth()
        .verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken;
            if (req.user.email_verified === false) {
                return res.status(403).json({
                    error: "Not verified email!"
                });
            };

            console.log(decodedToken);
            return db
                .collection("users")
                .where("userId", "==", req.user.uid)
                .limit(1)
                .get();
        })
        .then(data => {
            req.user.handle = data.docs[0].data().handle;
            req.user.imageUrl = data.docs[0].data().imageUrl;
            req.user.type = data.docs[0].data().type;

            return next();

        })
        .catch(err => {
            console.error("Error while veryfying token", err);
            return res.status(403).json(err);
        });
};