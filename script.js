const form = document.querySelector("form");

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const formData = new FormData(form);

    fetch("https://script.google.com/macros/s/AKfycbxnemMCr0vNCSMC4pQQXFtk_zFKVcY7S3DM6kr-1FoKsP-yIb3U1lmAlhIXi-qNybMv/exec", {
        method: "POST",
        body: formData
    })
    .then(() => {

        alert(
            "Welcome. You have entered the journey. Thank you for joining The River Kept Flowing."
        );

        form.reset();

    })
    .catch(() => {

        alert(
            "Something went wrong. Please try again."
        );

    });
});