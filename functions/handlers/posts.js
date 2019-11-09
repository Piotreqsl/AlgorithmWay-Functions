const {
    db,
    admin
} = require('../util/admin');
const config = require('../util/config');


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

                    shortDesc: doc.data().shortDesc,
                    java: doc.data().java,
                    cpp: doc.data().cpp,
                    python: doc.data().python,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    likeCount: doc.data().likeCount
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
        userImage: req.user.imageUrl,
        likeCount: 0,
        commentCount: 0,

        image1: {
            url: req.body.url1,
            filename: req.body.filename1
        },
        image2: {
            url: req.body.url2,
            filename: req.body.filename2
        },
        image3: {
            url: req.body.url3,
            filename: req.body.filename3
        },

        createdAt: new Date().toISOString()
    };

    db.collection("Posts")
        .add(newAlgorithm)
        .then(doc => {
            const resPost = newAlgorithm;
            resPost.postId = doc.id;
            res.json({
                resPost
            });
        })
        .catch(err => {
            res.status(500).json({
                error: "something went wrong"
            });
            console.error(err);
        });
}


exports.postOnePostSecond = (req, res) => {

    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');


    const busboy = new BusBoy({
        headers: req.headers
    });

    busboy.on("")






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
                    error: "Post not found"
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

exports.uploadPostImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');


    const busboy = new BusBoy({
        headers: req.headers
    });


    let imageFilename;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {


        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png' && mimetype !== 'image/jpg') {
            return res.status(400).json({
                error: "Wrong file submitted"
            });
        }

        const imageExstension = filename.split('.')[filename.split(".").length - 1];
        imageFilename = `${Math.round(Math.random()*1000000000000)}.${imageExstension}`;
        const filepath = path.join(os.tmpdir(), imageFilename);

        imageToBeUploaded = {
            filepath,
            mimetype
        };

        file.pipe(fs.createWriteStream(filepath));


    });

    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {

                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFilename}?alt=media`;
                return res.json({
                    url: imageUrl,
                    name: imageFilename
                })
            })
            .catch(err => {
                console.error(err);
                return res.status(500).json({
                    error: err.code
                });
            });

    });
    busboy.end(req.rawBody);
}


exports.deletePostImage = (req, res) => {


    if (admin.storage().bucket().file(req.params.filename).exists) {
        admin.storage().bucket().file(req.params.filename).delete().then(() => {
            return res.json({
                message: "deleted succesfly"
            });
        })
    } else {
        return res.status(404).json({
            error: "image not found"
        })
    }

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

exports.likePost = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('postId', "==", req.params.postId).limit(1);
    const postDocument = db.doc(`/Posts/${req.params.postId}`);

    let postData;

    postDocument.get().then(doc => {
            if (doc.exists) {
                postData = doc.data();
                postData.postId = doc.id;
                return likeDocument.get();
            } else {
                res.status(404).json({
                    error: "Post not found"
                });
            }
        })
        .then(data => {
            if (data.empty) {
                return db.collection('likes').add({
                        postId: req.params.postId,
                        userHandle: req.user.handle
                    })
                    .then(() => {
                        postData.likeCount++;
                        return postDocument.update({
                            likeCount: postData.likeCount
                        });
                    })
                    .then(() => {
                        return res.json(postData);
                    })
            } else {
                return res.status(400).json({
                    error: "Post already liked"
                });
            }
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({
                error: err.code
            });
        })

}

exports.unlikePost = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('postId', "==", req.params.postId).limit(1);
    const postDocument = db.doc(`/Posts/${req.params.postId}`);

    let postData;

    postDocument.get().then(doc => {
            if (doc.exists) {
                postData = doc.data();
                postData.postId = doc.id;
                return likeDocument.get();
            } else {
                res.status(404).json({
                    error: "Post not found"
                });
            }
        })
        .then(data => {
            if (data.empty) {
                return res.status(400).json({
                    error: "Post not liked"
                });

            } else {
                return db.doc(`/likes/${data.docs[0].id}`).delete()
                    .then(() => {
                        postData.likeCount--;
                        return postDocument.update({
                            likeCount: postData.likeCount
                        });

                    })
                    .then(() => {
                        res.json({
                            postData
                        });
                    })
            }
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({
                error: err.code
            });
        })

}