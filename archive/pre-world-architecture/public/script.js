document.addEventListener("DOMContentLoaded", function () {


    /*
        THE RIVER KEPT FLOWING
        Main site interaction system

        Handles:
        - Lead capture
        - Navigation behavior
        - Scroll experience
        - Future expansion points
    */



    const form = document.querySelector("form");



    if (form) {


        form.addEventListener("submit", function(event) {


            event.preventDefault();



            const formData = new FormData(form);



            fetch("https://script.google.com/macros/s/AKfycbxnemMCr0vNCSMC4pQQXFtk_zFKVcY7S3DM6kr-1FoKsP-yIb3U1lmAlhIXi-qNybMv/exec", {


                method: "POST",


                body: formData


            })



            .then(() => {



                showRiverMessage(
                    "Welcome to The River. Your journey has been added to the current."
                );



                form.reset();



            })



            .catch(() => {



                showRiverMessage(
                    "The river encountered an obstacle. Please try again."
                );



            });



        });


    }








    /*
        Smooth scrolling
        Creates a more intentional journey experience
    */


    const anchorLinks = document.querySelectorAll('a[href^="#"]');



    anchorLinks.forEach(link => {



        link.addEventListener("click", function(event) {



            const target = document.querySelector(
                this.getAttribute("href")
            );



            if (target) {


                event.preventDefault();



                target.scrollIntoView({


                    behavior: "smooth"



                });



            }



        });



    });








    /*
        Navigation enhancement

        Adds active awareness as the platform expands
    */


    const currentPage = window.location.pathname;



    const navigationLinks = document.querySelectorAll(".nav-links a");



    navigationLinks.forEach(link => {



        if (currentPage.includes(link.getAttribute("href"))) {


            link.classList.add("active");


        }



    });








    /*
        Future expansion:
        
        This section is reserved for:
        
        - Article loading
        - Video integration
        - Membership systems
        - Resource libraries
        - Community features
        - Commerce
        - Donations
        - Affiliate tracking
        
        The foundation is built to expand without rebuilding.
    */



});








function showRiverMessage(message) {



    const existingMessage = document.querySelector(".river-message");



    if (existingMessage) {


        existingMessage.remove();


    }






    const messageBox = document.createElement("div");



    messageBox.className = "river-message";



    messageBox.innerText = message;



    document.body.appendChild(messageBox);






    setTimeout(() => {


        messageBox.classList.add("visible");


    }, 50);







    setTimeout(() => {


        messageBox.classList.remove("visible");



        setTimeout(() => {


            messageBox.remove();



        }, 500);



    }, 5000);



}