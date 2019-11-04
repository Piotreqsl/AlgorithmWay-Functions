const {
    db
} = require('../util/admin');


exports.getAllPosts = (req, res) => {
    db.collection("Posts")
        .orderBy("createdAt", "desc")
        .get()
        .then(data => {
            let posts = [];
            data.forEach(doc => {
                posts.push({
                    postId: doc.id,
                    title: doc.data().title,
                    desc: doc.data().desc,
                    shortDesc: doc.data().shortDesc,
                    java: doc.data().java,
                    cpp: doc.data().cpp,
                    python: doc.data().python,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                });
            });
            return res.json(posts);
        })
        .catch(err => console.error(err));
}




exports.postOnePost = (req, res) => {

    const newAlgorithm = {
        desc: req.body.desc,
        shortDesc: req.body.shortDesc,
        title: req.body.title,
        userHandle: req.user.handle, /// tutaj na fbauth req.user.handle
        java: req.body.java,
        cpp: req.body.cpp,
        python: req.body.python,
        createdAt: new Date().toISOString()
    };

    db.collection("Posts")
        .add(newAlgorithm)
        .then(doc => {
            res.json({
                message: `document ${doc.id} created successfully.`
            });
        })
        .catch(err => {
            res.status(500).json({
                error: "something went wrong"
            });
            console.error(err);
        });
}