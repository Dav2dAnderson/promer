fetch('http://localhost:3000/api/management/projects/')
  .then(res => console.log('STATUS:', res.status, 'URL:', res.url, 'REDIRECTED:', res.redirected))
  .catch(err => console.error('ERROR:', err));
