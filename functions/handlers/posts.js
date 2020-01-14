const {
  db,
  admin
} = require("../util/admin");
const config = require("../util/config");

exports.getAllPosts = (req, res) => {
  var first = db
    .collection("Posts")
    .orderBy("createdAt", "desc")
    .limit(15);

  first
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
          userImage: doc.data().userImage,
          verified: doc.data().verified,
          categories: doc.data().categories
        });
      });

      return res.json(posts);
    })
    .catch(err => console.error(err));
};

exports.getAllPostsToAdmin = (req, res) => {
  var first = db.collection("Posts").orderBy("createdAt", "desc");

  first
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
          userImage: doc.data().userImage,
          verified: doc.data().verified,
          categories: doc.data().categories
        });
      });

      return res.json(posts);
    })
    .catch(err => console.error(err));
};

exports.getNextPosts = (req, res) => {
  const lastDocument = db.doc(`/Posts/${req.params.postId}`);

  lastDocument.get().then(doco => {
    if (doco.exists) {
      db.collection("Posts")
        .orderBy("createdAt", "desc")
        .startAfter(doco)
        .limit(15)
        .get()
        .then(data => {
          if (data.size === 0) {
            return res.status(404).json({
              message: "No more posts found"
            });
          } else {
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
                userImage: doc.data().userImage,
                verified: doc.data().verified,
                categories: doc.data().categories
              });
            });

            return res.json(posts);
          }
        });
    }
  });
};

exports.postOnePost = (req, res) => {
  const isEmpty = string => {
    if (
      string === null ||
      typeof string === "undefined" ||
      string.length === 0
    ) {
      return true;
    } else {
      return false;
    }
  };
  const newAlgorithm = {
    shortDesc: req.body.shortDesc,
    title: req.body.title,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    contributors: [],
    likeCount: 0,
    commentCount: 0,
    verified: false,
    categories: [],
    images: [],
    createdAt: new Date().toISOString()
  };

  if (!isEmpty(req.body.categories))
    newAlgorithm.categories = req.body.categories;

  if (req.user.admin) newAlgorithm.verified = true;

  if (!isEmpty(req.body.java)) newAlgorithm.java = req.body.java;
  if (!isEmpty(req.body.cpp)) newAlgorithm.cpp = req.body.cpp;
  if (!isEmpty(req.body.python)) newAlgorithm.python = req.body.python;

  if (!isEmpty(req.body.images)) newAlgorithm.images = req.body.images;

  if (!isEmpty(req.body.desc)) newAlgorithm.desc = req.body.desc;

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
      } else {
        postData = doc.data();
        postData.postId = doc.id;
        return db
          .collection("comments")
          .orderBy("createdAt", "desc")
          .where("postId", "==", req.params.postId)
          .get()
          .then(data => {
            postData.comments = [];
            data.forEach(doc => {
              const comment = doc.data();
              comment.id = doc.id;
              postData.comments.push(comment);
            });
            postData.numberOfComments = postData.comments.length;
            return res.json(postData);
          })

          .catch(err => {
            console.error(err);
            res.status(500).json({
              error: err.code
            });
          });
      }
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
      .bucket(config.storageBucket)
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
    .bucket(config.storageBucket)
    .file(req.params.filename).exists
  ) {
    admin
      .storage()
      .bucket(config.storageBucket)
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
  if (req.body.body.trim() === "") {
    return res.status(400).json({
      comment: "Must not be empty"
    });
  } else {
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
        return db
          .collection("comments")
          .add(newComment)
          .then(document => {
            const resComment = newComment;
            resComment.id = document.id;
            res.json(resComment);
          });
      })

      .catch(err => {
        console.log(err);
        res.status(500).json({
          error: "Something went wrong"
        });
      });
  }
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
        return res.status(400).json({
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
        return res.status(404).json({
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
        return (
          db
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
          })
        );
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
        return (
          db
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
            res.json(postData);
          })
        );
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
      } else {
        if (
          doc.data().userHandle === req.user.handle ||
          req.user.admin === true
        ) {

          return document.delete().then(() => {
            res.json({
              message: "Post deleted successfully"
            });
          });



        } else {
          return res.status(403).json({
            error: "Unauthorized"
          });
        }
      }
    })

    .catch(err => {
      console.error(err);
      return res.status(500).json({
        error: err.code
      });
    });
};

exports.deleteComment = (req, res) => {
  const document = db.doc(`/comments/${req.params.commentId}`);

  document.get().then(doc => {
    if (!doc.exists) {
      return res.status(404).json({
        error: "Comment not found"
      });
    } else {
      if (
        doc.data().userHandle === req.user.handle ||
        req.user.admin === true
      ) {

        const postDoc = db.doc(`/Posts/${doc.data().postId}`);

        return postDoc.get().then(postData => {
          return postData.ref
            .update({
              commentCount: postData.data().commentCount - 1
            })
            .then(() => {
              return document.delete().then(() => {
                return res
                  .json({
                    message: "Post deleted successfully"
                  })
                  .catch(err => {
                    return res.status(500).json({
                      error: err.code
                    });
                  });
              });
            });
        });
      } else {
        return res.status(400).json({
          erorr: "Unauthorized"
        });
      }
    }
  });
};

exports.createEditRequest = (req, res) => {
  const isEmpty = string => {
    if (
      string === null ||
      typeof string === "undefined" ||
      string.length === 0 ||
      string === ""
    ) {
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
    userImage: req.user.imageUrl,
    categories: [],
    images: [],
    createdAt: new Date().toISOString(),
    java: req.body.java,
    python: req.body.python,
    cpp: req.body.cpp
  };

  let newAlgorithmFormatted = {
    desc: req.body.desc,
    shortDesc: req.body.shortDesc,
    title: req.body.title,
    categories: [],
    images: [],
    java: req.body.java,
    python: req.body.python,
    cpp: req.body.cpp
  };

  if (!isEmpty(req.body.categories)) {
    newAlgorithm.categories = req.body.categories;
    newAlgorithmFormatted.categories = req.body.categories;
  }
  if (!isEmpty(req.body.images)) {
    newAlgorithm.images = req.body.images;
    newAlgorithmFormatted.images = req.body.images;
  }

  // Koniec getowania postów

  const originalPost = db.doc(`/Posts/${req.params.postId}`);

  originalPost
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Post doesnt exist"
        });
      }
      newAlgorithm.originalPosterHandle = doc.data().userHandle;

      /// Sprawdzenie czy edit przez autora lub admina
      if (req.user.handle === doc.data().userHandle) {
        return db
          .doc(`/Posts/${req.params.postId}`)
          .update(newAlgorithmFormatted)
          .then(() => {
            return res.status(200).json({
              success: "Edited immediately by owner"
            });
          });
      }

      if (req.user.admin) {
        return db
          .doc(`/Posts/${req.params.postId}`)
          .update(newAlgorithmFormatted)
          .then(() => {
            return db
              .collection("notifications")
              .add({
                createdAt: new Date().toISOString(),
                postId: doc.id,
                recipient: doc.data().userHandle,
                sender: "AlgorithmWay admin",
                read: false,
                type: "edit-request-admin",
                title: doc.data().title
              })
              .then(() => {
                return res.status(200).json({
                  success: "Edited immediately by admin"
                });
              });
          });
      }

      return db.collection("edit-requests").add(newAlgorithm);
    })
    .then(doc => {
      const resPost = newAlgorithm;
      resPost.postId = doc.id;
      res.status(200).json({
        success: "Edit request created successfully"
      });
    })
    .catch(err => {
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

  editDoc
    .get()
    .then(doc => {
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

      return document.get();
    })
    .then(postDoc => {
      postData = postDoc.data();

      // Sprawdzanie czy już nie jest zatwierdzone
      if (editData.approved) {
        return res.status(400).json({
          error: "Edit request already approved"
        });
      }

      if (req.user.handle === editData.originalPosterHandle) {
        // Usuwanie zbędnych pól pomocniczych

        delete editDataFormatted.originalPostId;
        delete editDataFormatted.originalPosterHandle;
        delete editDataFormatted.approvedBy;
        delete editDataFormatted.approved;
        delete editDataFormatted.createdAt;
        delete editDataFormatted.userHandle;
        delete editDataFormatted.userImage;

        editDataFormatted.contributors = [];
        editDataFormatted.contributors.concat(postData.contributors);
        editDataFormatted.contributors.concat(editData.userHandle);

        return db
          .doc(`/Posts/${editData.originalPostId}`)
          .update(editDataFormatted)
          .then(() => {
            editData.approved = true;
            editData.approvedBy = "owner";

            return db.doc(`/edit-requests/${id}`).update(editData);
          })
          .then(() => {
            return res.status(200).json({
              success: "Succesfuly updated post"
            });
          });
      } else if (req.user.admin) {
        // Usuwanie zbędnych pól pomocniczych
        console.log("if przeszedł then niby");

        delete editDataFormatted.originalPostId;
        delete editDataFormatted.originalPosterHandle;
        delete editDataFormatted.approvedBy;
        delete editDataFormatted.approved;
        delete editDataFormatted.createdAt;
        delete editDataFormatted.userHandle;
        delete editDataFormatted.userImage;

        editDataFormatted.contributors = [];
        editDataFormatted.contributors.concat(postData.contributors);
        editDataFormatted.contributors.concat(editData.userHandle);

        console.log("Sformatowany edit data to " + editData);

        return db
          .doc(`/Posts/${editData.originalPostId}`)
          .update(editDataFormatted)
          .then(() => {
            editData.approved = true;
            editData.approvedBy = "admin";

            return db.doc(`/edit-requests/${id}`).update(editData);
          })
          .then(() => {
            return res.status(200).json({
              success: "Succesfuly updated post"
            });
          });
      } else {
        return res.status(400).json({
          error: "Permission denied"
        });
      }
    })
    .catch(err => {
      console.error(err);
      return res.status(400).json({
        erorr: err.code
      });
    });
};

exports.rejectEditRequest = (req, res) => {
  const editDoc = db.doc(`/edit-requests/${req.params.editPostId}`);

  editDoc
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Edit request not found"
        });
      } else {
        let notification = {};

        if (req.user.admin) {
          notification = {
            recipient: doc.data().userHandle,
            type: "edit-req-reject",
            createdAt: new Date().toISOString(),
            title: doc.data().title,
            sender: "AlgorithmWay admin",
            read: false,
            postId: doc.data().originalPostId
          };
        } else if (req.user.handle == doc.data().originalPosterHandle) {
          notification = {
            recipient: doc.data().userHandle,
            type: "edit-req-reject",
            createdAt: new Date().toISOString(),
            title: doc.data().title,
            sender: doc.data().originalPosterHandle,
            read: false,
            postId: doc.data().originalPostId
          };
        } else {
          return res.status(400).json({
            error: "You dont have rights to approve"
          });
        }

        return db
          .collection("notifications")
          .add(notification)
          .then(() => {
            return editDoc.delete().then(() => {
              return res.status(200).json({
                success: "Rejected successfully"
              });
            });
          });
      }
    })
    .catch(err => {
      console.error(err);
      return res.status(400).json({
        erorr: err.code
      });
    });
};

exports.getEditRequest = (req, res) => {
  let editRequestData = {};
  let postData = {};

  let response = {};

  db.doc(`/edit-requests/${req.params.editPostId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Edit request not found"
        });
      } else {
        if (
          (req.user.admin === true ||
            req.user.handle === doc.data().originalPosterHandle) &&
          doc.data().approved === false
        ) {
          editRequestData = doc.data();
          editRequestData.id = doc.id;

          response.editRequest = editRequestData;

          return db
            .doc(`/Posts/${editRequestData.originalPostId}`)
            .get()
            .then(postDoc => {
              if (!doc.exists) {
                return res.status(404).json({
                  erorr: "Original post not found"
                });
              } else {
                postData = postDoc.data();
                response.originalPost = postData;

                return res.json(response);
              }
            });
        } else {
          return res.status(400).json({
            error: "You cant view this edit request"
          });
        }
      }
    });
};