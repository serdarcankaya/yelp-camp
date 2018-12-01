var mongoose = require("mongoose");
var Campground = require("./models/campground");
var Comment = require("./models/comment");

var data = [{
        name: "Cloud's Rest",
        image: "https://www.nps.gov/hosp/planyourvisit/images/campground_big.jpg",
        description: "All camping at Gulpha Gorge Campground costs $30 per night ($15 per night if you have an America the Beautiful: The National Parks and Federal Recreational Lands Senior or Access Pass, formerly the Golden Age or Golden Access Pass)."
    },
    {
        name: "Desert Mesa",
        image: "http://www.parkcamper.com/Yellowstone-National-Park/Yellowstone-National-Park-Canyon-campground-1.jpg",
        description: "Canyon is another very large Yellowstone National Park campground. Its location is central to the park, which makes it a much shorter drive to the various attractions, but also makes it a busy campground and area in general."
    },
    {
        name: "Canyon Floor",
        image: "https://www.nps.gov/grsa/planyourvisit/images/web-campground-2015.jpg",
        description: "Many campsites have a view of the dunes and Sangre de Cristo Mountains"
    }
];



function seedDB() {
    //Remove all campgrounds
    Campground.remove({}, function(err) {
        if (err) {
            console.log(err);
        }
        console.log("removed campgrounds!");
        Comment.remove({}, function(err) {
            if (err) {
                console.log(err);
            }
            console.log("removed comments!");
            //add a few campgrounds
            data.forEach(function(seed) {
                Campground.create(seed, function(err, campground) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        console.log("added a campground");
                        //create a comment
                        Comment.create({
                            text: "This place is great, but I wish there was internet",
                            author: "Homer"
                        }, function(err, comment) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                campground.comments.push(comment);
                                campground.save();
                                console.log("Created new comment");
                            }
                        });
                    }
                });
            });
        });
    });
    //add a few comments
}

module.exports = seedDB;
