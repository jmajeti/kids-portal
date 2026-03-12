const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('public/3_6 Newsletter - Bethany.pdf');

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('public/parsed-newsletter.txt', data.text);
    console.log("PDF parsed successfully!");
}).catch(err => {
    console.error("Error parsing PDF:", err);
});
