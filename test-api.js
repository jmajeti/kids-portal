const fs = require('fs');

async function test() {
  const formData = new FormData();
  
  // Create File mock for browser Fetch API
  const fileBuffer = fs.readFileSync('./public/3_6 Newsletter - Bethany.pdf');
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('file', blob, 'newsletter.pdf');
  formData.append('studentId', 'all');

  console.log('Sending request to Vercel API...');
  
  try {
    const res = await fetch('https://kids-portal-eta.vercel.app/api/admin/curriculum/process', {
      method: 'POST',
      body: formData
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response Headers:', res.headers.get('content-type'));
    
    try {
      const json = JSON.parse(text);
      console.log('Success Parse:', json);
    } catch (e) {
      console.log('Failed to parse JSON, Raw text is:');
      console.log(text.slice(0, 1000));
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

test();
