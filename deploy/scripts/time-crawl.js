const start = Date.now();
console.log('Triggering crawl (FORCE update)...');
fetch('http://localhost:3000/api/notices/crawl?force=true')
    .then(res => res.json())
    .then(data => {
        const duration = (Date.now() - start) / 1000;
        console.log(`Crawl completed in ${duration} seconds.`);
        console.log(`Status: ${data.success ? 'Success' : 'Failed'}`);
    })
    .catch(err => console.error('Error:', err));
