const {
  db,
  admin
} = require("../util/admin");
const config = require("../util/config");

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
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          userImage: doc.data().userImage
        });
      });
      return res.json(posts);
    })
    .catch(err => console.error(err));
};

exports.postOnePost = (req, res) => {

  const isEmpty = string => {
    if (string === null || typeof string === "undefined" || string.length === 0) {
      return true;
    } else {
      return false;
    }
  };
  const newAlgorithm = {
    desc: req.body.desc,
    shortDesc: req.body.shortDesc,
    title: req.body.title,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    contributors: [],
    likeCount: 0,
    commentCount: 0,
    verifed: false,

    image1: {},
    image2: {},
    image3: {},

    createdAt: new Date().toISOString()
  };

  if (!isEmpty(req.body.java)) newAlgorithm.java = req.body.java;
  if (!isEmpty(req.body.cpp)) newAlgorithm.cpp = req.body.cpp;
  if (!isEmpty(req.body.python)) newAlgorithm.python = req.body.python;

  if (!isEmpty(req.body.url1)) newAlgorithm.image1.url = req.body.url1;
  if (!isEmpty(req.body.filename1)) newAlgorithm.image1.filename = req.body.filename1;

  if (!isEmpty(req.body.url2)) newAlgorithm.image2.url = req.body.url2;
  if (!isEmpty(req.body.filename2)) newAlgorithm.image2.filename = req.body.filename2;

  if (!isEmpty(req.body.url3)) newAlgorithm.image3.url = req.body.url3;
  if (!isEmpty(req.body.filename3)) newAlgorithm.image3.filename = req.body.filename3;



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
};

exports.getPost = (req, res) => {
  let postData = {};
  db.doc(`/Posts/${req.params.postId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Post not found"
        });
      }
      postData = doc.data();
      postData.postId = doc.id;

      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("postId", "==", req.params.postId)
        .get();
    })
    .then(data => {
      postData.comments = [];
      data.forEach(doc => {
        postData.comments.push(doc.data());
      });

      postData.numberOfCommnets = postData.comments.length;
      return res.json(postData);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

exports.uploadPostImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({
    headers: req.headers
  });

  let imageFilename;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (
      mimetype !== "image/jpeg" &&
      mimetype !== "image/png" &&
      mimetype !== "image/jpg"
    ) {
      return res.status(400).json({
        error: "Wrong file submitted"
      });
    }

    const imageExstension = filename.split(".")[filename.split(".").length - 1];
    imageFilename = `${Math.round(
      Math.random() * 1000000000000
    )}.${imageExstension}`;
    const filepath = path.join(os.tmpdir(), imageFilename);

    imageToBeUploaded = {
      filepath,
      mimetype
    };

    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
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
        });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({
          error: err.code
        });
      });
  });
  busboy.end(req.rawBody);
};

exports.deletePostImage = (req, res) => {
  if (
    admin
    .storage()
    .bucket()
    .file(req.params.filename).exists
  ) {
    admin
      .storage()
      .bucket()
      .file(req.params.filename)
      .delete()
      .then(() => {
        return res.json({
          message: "deleted succesfly"
        });
      });
  } else {
    return res.status(404).json({
      error: "image not found"
    });
  }
};

exports.commentOnPost = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({
      comment: "Must not be empty"
    });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    postId: req.params.postId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };

  db.doc(`/Posts/${req.params.postId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Post not found"
        });
      }
      return doc.ref.update({
        commentCount: doc.data().commentCount + 1
      });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: "Something went wrong"
      });
    });
};

exports.addFav = (req, res) => {
  const favDocument = db
    .collection("favourites")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .limit(1);
  const postDocument = db.doc(`/Posts/${req.params.postId}`);
  let postData;

  postDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        postData = doc.data();
        console.log(postData);
        postData.postId = doc.id;
        return favDocument.get();
      } else {
        return res.status(404).json({
          error: "Post not found "
        });
      }
    })
    .then(data => {
      if (data.empty) {
        return db
          .collection("favourites")
          .add({
            postId: req.params.postId,
            userHandle: req.user.handle
          })
          .then(() => {
            return res.json(postData);
          });
      } else {
        return res
          .status(400)
          .json({
            error: "Post already added to favourites"
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

exports.removeFav = (req, res) => {
  const favDocument = db
    .collection("favourites")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .limit(1);
  const postDocument = db.doc(`/Posts/${req.params.postId}`);
  let postData;

  postDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return favDocument.get();
      } else {
        return res.status(404).json({
          error: "Post not found "
        });
      }
    })
    .then(data => {
      if (data.empty) {
        return res
          .status(404)
          .json({
            error: "Post is not added to favourites "
          });
      } else {
        return db
          .doc(`/favourites/${data.docs[0].id}`)
          .delete()
          .then(() => {
            return res.json({
              success: "Post removed from favourites"
            });
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

exports.likePost = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .limit(1);
  const postDocument = db.doc(`/Posts/${req.params.postId}`);

  let postData;
  let UserData;

  postDocument
    .get()
    .then(doc => {
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
        return db
          .collection("likes")
          .add({
            postId: req.params.postId,
            userHandle: req.user.handle
          })
          .then(() => {
            postData.likeCount++;
            return postDocument.update({
              likeCount: postData.likeCount
            });
          })

          // Tu można rep
          //.then(() => {
          // return db
          //  .doc(`/users/${postData.userHandle}`)
          //  .get()
          // .then(userDoc => {
          //   if (userDoc.exists) {
          //    UserData = userDoc.data();
          //   UserData.reputation++;
          //    return db.doc(`/users/${postData.userHandle}`).update({
          //     reputation: UserData.reputation
          //    });
          //  } else console.log("User not found, reputation remains");
          //  });
          //  })

          .then(() => {
            return res.json(postData);
          });
      } else {
        return res.status(400).json({
          error: "Post already liked"
        });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

exports.unlikePost = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .limit(1);
  const postDocument = db.doc(`/Posts/${req.params.postId}`);

  let postData;

  postDocument
    .get()
    .then(doc => {
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
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            postData.likeCount--;
            return postDocument.update({
              likeCount: postData.likeCount
            });
          })

          /// Tu można ew rep
          // .then(() => {
          // return db
          // .doc(`/users/${postData.userHandle}`)
          //.get()
          //.then(userDoc => {
          //if (userDoc.exists) {
          //UserData = userDoc.data();
          //UserData.reputation--;
          //return db.doc(`/users/${postData.userHandle}`).update({
          // reputation: UserData.reputation
          //});
          // } else console.log("User not found, reputation remains");
          //});
          //})

          .then(() => {
            res.json({
              postData
            });
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        error: err.code
      });
    });
};

exports.deletePost = (req, res) => {
  const document = db.doc(`/Posts/${req.params.postId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Post not found"
        });
      }
      if (
        doc.data().userHandle !== req.user.handle ||
        req.user.adminPrivileges !== false
      ) {
        return res.status(403).json({
          error: "Unauthorized"
        });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({
        message: "Post deleted successfully"
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({
        error: err.code
      });
    });
};

exports.createEditRequest = (req, res) => {

  const isEmpty = string => {
    if (string === null || typeof string === "undefined" || string.length === 0) {
      return true;
    } else {
      return false;
    }
  };


  const newAlgorithm = {
    desc: req.body.desc,
    shortDesc: req.body.shortDesc,
    title: req.body.title,
    userHandle: req.user.handle,
    originalPostId: req.params.postId,
    approved: false,
    approvedBy: "none",


    image1: {},
    image2: {},
    image3: {},

    createdAt: new Date().toISOString()
  };

  if (!isEmpty(req.body.java)) newAlgorithm.java = req.body.java;
  if (!isEmpty(req.body.cpp)) newAlgorithm.cpp = req.body.cpp;
  if (!isEmpty(req.body.python)) newAlgorithm.python = req.body.python;

  if (!isEmpty(req.body.url1)) newAlgorithm.image1.url = req.body.url1;
  if (!isEmpty(req.body.filename1)) newAlgorithm.image1.filename = req.body.filename1;

  if (!isEmpty(req.body.url2)) newAlgorithm.image2.url = req.body.url2;
  if (!isEmpty(req.body.filename2)) newAlgorithm.image2.filename = req.body.filename2;

  if (!isEmpty(req.body.url3)) newAlgorithm.image3.url = req.body.url3;
  if (!isEmpty(req.body.filename3)) newAlgorithm.image3.filename = req.body.filename3;

  // Koniec getowania postów


  const originalPost = db.doc(`/Posts/${req.params.postId}`);

  originalPost.get().then(doc => {

    if (!doc.exists) {
      return res.status(404).json({
        error: "Post doesnt exist"
      });
    }
    newAlgorithm.originalPosterHandle = doc.data().userHandle;

    return db.collection('edit-requests').add(newAlgorithm);
  }).then(doc => {
    const resPost = newAlgorithm;
    resPost.postId = doc.id;
    res.json({
      resPost
    });
  }).catch(err => {
    res.status(500).json({
      error: "something went wrong"
    });
    console.error(err);
  });


};

exports.approveEditRequest = (req, res) => {
  const editDoc = db.doc(`/edit-requests/${req.params.editPostId}`);
  let postData;

  let editDataFormatted;
  let editData;
  let id;


  editDoc.get().then(doc => {

      editDataFormatted = doc.data();
      editData = doc.data();
      id = doc.id;

      // Checkowanie czy istnieje
      if (!doc.exists) {
        return res.status(404).json({
          error: "Edit request not found"
        });
      }
      const document = db.doc(`/Posts/${doc.data().originalPostId}`);

      console.log("Pierwszy then niby")
      return document.get();
    })
    .then(postDoc => {
      postData = postDoc.data();


      // Sprawdzanie czy już nie jest zatwierdzone
      if (editData.approved) {
        return res.status(400).json({
          error: "Edit request already approved"
        })
      }

      console.log("user handle z req " + req.user.handle);


      if (req.user.handle === editData.originalPosterHandle) {
        // Usuwanie zbędnych pól pomocniczych
        console.log("if przeszedł then niby")


        delete editDataFormatted.originalPostId;
        delete editDataFormatted.originalPosterHandle;
        delete editDataFormatted.approvedBy;
        delete editDataFormatted.approved;
        delete editDataFormatted.createdAt;
        delete editDataFormatted.userHandle;


        //editDataFormatted.contributors = [];
        //editDataFormatted.contributors.concat(postData.contributors);
        //editDataFormatted.contributors.push(editData.userHandle)


        console.log("Sformatowany edit data to " + editData);

        return db.doc(`/Posts/${editData.originalPostId}`).update(editDataFormatted)
          .then(() => {
            editData.approved = true;
            editData.approvedBy = "owner";

            return db.doc(`/edit-requests/${id}`).update(editData);
          })
          .then(() => {
            return res.status(200).json({
              success: "Succesfuly updated post"
            });
          })


      }

      if (req.user.admin) {
        // Usuwanie zbędnych pól pomocniczych
        console.log("if przeszedł then niby")


        delete editDataFormatted.originalPostId;
        delete editDataFormatted.originalPosterHandle;
        delete editDataFormatted.approvedBy;
        delete editDataFormatted.approved;
        delete editDataFormatted.createdAt;
        delete editDataFormatted.userHandle;


        //editDataFormatted.contributors = [];
        //editDataFormatted.contributors.concat(postData.contributors);
        //editDataFormatted.contributors.push(editData.userHandle)


        console.log("Sformatowany edit data to " + editData);

        return db.doc(`/Posts/${editData.originalPostId}`).update(editDataFormatted)
          .then(() => {
            editData.approved = true;
            editData.approvedBy = "admin";

            return db.doc(`/edit-requests/${id}`).update(editData);
          })
          .then(() => {
            return res.status(200).json({
              success: "Succesfuly updated post"
            });
          })


      } else {
        return res.status(400).json({
          error: "Permission denied"
        })
      }


    })
    .catch(err => {
      console.error(err);
      return res.status(400).json({
        erorr: err.code
      });
    })

}