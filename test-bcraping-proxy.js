// Test Bcraping Proxy API
const bjId = 'pyh3646';

fetch(`http://localhost:3000/api/bcraping-proxy/${bjId}`)
    .then(res => res.json())
    .then(data => {
        console.log('=== Bcraping Proxy Response ===');
        console.log('Success:', data.success);
        console.log('\nStats:');
        console.log(JSON.stringify(data.stats, null, 2));
        console.log('\nRanking List:');
        console.log(JSON.stringify(data.rankingList, null, 2));
        console.log('\nTotal Rankings:', data.rankingList?.length || 0);
    })
    .catch(err => {
        console.error('Error:', err);
    });
