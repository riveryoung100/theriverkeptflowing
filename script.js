const form = document.querySelector("form");

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const formData = new FormData(form);

    fetch("https://script.google.com/macros/s/AKfycbxnemMCr0vNCSMC4pQQXFtk_zFKVcY7S3DM6kr-1FoKsP-yIb3U1lmAlhIXi-qNybMv/exec", {
        method: "POST",
        body: formData
    })
    .then(() => {
        alert("Thanks! You're connected. I'll be in touch soon.");
        form.reset();
    })
    .catch(() => {
        alert("Something went wrong. Please try again.");
    });
});