var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var Review = require("../models/review");
var Comment = require("../models/comment");
var multer = require('multer');
var cloudinary = require('cloudinary');
var NodeGeocoder = require('node-geocoder');

var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};

var geocoder = NodeGeocoder(options);

//Multer Config
var storage = multer.diskStorage({
    filename: function(req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
var imageFilter = function(req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter })

//Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//RESTFUL- INDEX - Display All List Of Campgrounds
router.get("/", function(req, res) {
    var noMatch = null;
    //Try to find search query in DB
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({ name: regex }, function(err, allCampgrounds) {
            if (err) {
                console.log(err);
            }
            else {
                if (allCampgrounds.length < 1) {
                    noMatch = "No campgrounds match that query, please try again.";
                }
                res.render("campgrounds/index", { campgrounds: allCampgrounds, noMatch: noMatch });
            }
        });
    }
    else {
        // Get all campgrounds from DB
        Campground.find({}, function(err, allCampgrounds) {
            if (err) {
                console.log(err);
            }
            else {
                res.render("campgrounds/index", { campgrounds: allCampgrounds, noMatch: noMatch });
            }
        });
    }
});

//RESTFUL - CREATE - Add New Campground To DB
//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    // get data from form and add to campgrounds array
    var name = req.body.name;
    var image = req.body.image;
    var desc = req.body.description;
    var price = req.body.price;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    geocoder.geocode(req.body.location, function(err, data) {

        //Error Handling For Autocomplete API Requests

        //Error handling provided by google docs -https://developers.google.com/places/web-service/autocomplete 
        if (err || data.status === 'ZERO_RESULTS') {
            req.flash('error', 'Invalid address, try typing a new address');
            return res.redirect('back');
        }

        //Error handling provided by google docs -https://developers.google.com/places/web-service/autocomplete 
        if (err || data.status === 'REQUEST_DENIED') {
            req.flash('error', 'Something Is Wrong Your Request Was Denied');
            return res.redirect('back');
        }

        //Error handling provided by google docs -https://developers.google.com/places/web-service/autocomplete 
        if (err || data.status === 'OVER_QUERY_LIMIT') {
            req.flash('error', 'All Requests Used Up');
            return res.redirect('back');
        }

        //Credit To Ian For Fixing The Geocode Problem - https://www.udemy.com/the-web-developer-bootcamp/learn/v4/questions/2788856
        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;


        //Reference: Zarko And Ian Helped Impliment the Image Upload - https://github.com/nax3t/image_upload_example

        cloudinary.uploader.upload(req.file.path, function(result) {

            //image variable needs to be here so the image can be stored and uploaded to cloudinary
            image = result.secure_url;


            //Captures All Objects And Stores Them
            var newCampground = { name: name, image: image, description: desc, author: author, price: price, location: location, lat: lat, lng: lng };

            // Create a new campground and save to DB by using the create method
            Campground.create(newCampground, function(err, newlyCreated) {
                if (err) {
                    //Logs Error
                    req.flash('error', err.message);

                    return res.redirect('back');

                }
                else {

                    //redirect back to campgrounds page

                    //Logs Error
                    console.log(newlyCreated);

                    //Flash Message 
                    req.flash("success", "Campground Added Successfully");

                    //Redirects Back To Featured Campgrounds Page
                    res.redirect("/campgrounds");
                }
            });
        });
    });
});
//RESTFUL - NEW - Show Form To Create New Campground
router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new");
});

//RESTFUL - SHOW - Shows More Info About Specific Campground
router.get("/:id", function(req, res) {
    //Find the background with provided ID
    Campground.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: { sort: { createdAt: -1 } }
    }).exec(function(err, foundCampground) {
        if (err || !foundCampground) {
            req.flash("error", "Campground not found");
            res.redirect("back");
        }
        else {
            //render show template with that background
            //console.log(foundCampground);
            res.render("campgrounds/show", { campground: foundCampground });
        }
    });

});

//RESTFUL EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground) {
        res.render("campgrounds/edit", { campground: foundCampground });
    });
});

//RESTFUL UPDATE CAMPGROUND ROUTE
// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res) {

    geocoder.geocode(req.body.campground.location, function(err, data) {

        //Error Handling For Autocomplete API Requests

        //Error handling provided by google docs -https://developers.google.com/places/web-service/autocomplete 
        if (err || data.status === 'ZERO_RESULTS') {
            req.flash('error', 'Invalid address, try typing a new address');
            return res.redirect('back');
        }

        //Error handling provided by google docs - https: //developers.google.com/places/web-service/autocomplete 
        if (err || data.status === 'REQUEST_DENIED') {
            req.flash('error', 'Something Is Wrong Your Request Was Denied');
            return res.redirect('back');
        }

        //Error handling provided by google docs -https://developers.google.com/places/web-service/autocomplete 
        if (err || data.status === 'OVER_QUERY_LIMIT') {
            req.flash('error', 'All Requests Used Up');
            return res.redirect('back');
        }

        //Credit To Ian For Fixing The Geocode Problem - https://www.udemy.com/the-web-developer-bootcamp/learn/v4/questions/2788856
        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;

        cloudinary.uploader.upload(req.file.path, function(result) {
            if (req.file.path) {
                // add cloudinary url for the image to the campground object under image property
                req.body.campground.image = result.secure_url;
            }

            var newData = { name: req.body.campground.name, image: req.body.campground.image, description: req.body.campground.description, price: req.body.campground.price, location: location, lat: lat, lng: lng };


            //Updated Data Object
            Campground.findByIdAndUpdate(req.params.id, { $set: newData }, function(err, campground) {
                if (err) {
                    //Flash Message
                    req.flash("error", err.message);

                    //Redirects Back
                    res.redirect("back");
                }
                else {
                    //Flash Message
                    req.flash("success", "Successfully Updated!");

                    //Redirects To Edited Campground
                    res.redirect("/campgrounds/" + campground._id);
                }
            }); //End Campground/findBoyIdAndUpdate
        }); //Ends Cloudinary Image Upload
    }); //Ends Geocoder()
}); //Ends Put Router
//RESTFUL DESTROY CAMPGROUND ROUTE
// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, campground) {
        if (err) {
            res.redirect("/campgrounds");
        }
        else {
            // deletes all comments associated with the campground
            Comment.remove({ "_id": { $in: campground.comments } }, function(err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.remove({ "_id": { $in: campground.reviews } }, function(err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    campground.remove();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}


module.exports = router;
