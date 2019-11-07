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


exports.getPost = (req, res) => {
    let postData = {};
    db.doc(`/Posts/${req.params.postId}`).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({
                    error: "Scream not found"
                });
            }
            postData = doc.data();
            postData.postId = doc.id;
            return db.collection('comments').orderBy('createdAt', 'desc').where('postId', '==', req.params.postId).get();
        })
        .then(data => {
            postData.comments = [];
            data.forEach(doc => {
                postData.comments.push(doc.data())
            });
            return res.json(postData);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: err.code
            });
        })


}


exports.commentOnPost = (req, res) => {
    if (req.body.body.trim() === '') return res.status(400).json({
        error: "Must not be empty"
    });

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        postId: req.params.postId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };

    db.doc(`/Posts/${req.params.postId}`).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({
                    error: "Post not found"
                });
            }
            return db.collection('comments').add(newComment);

        })
        .then(() => {
            res.json(newComment);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: "Something went wrong"
            });
        })
}