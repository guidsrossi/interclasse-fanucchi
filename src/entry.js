if (location.pathname.startsWith('/admin')) import('./admin.js');
else if (location.pathname.startsWith('/professor')) import('./teacher.js');
else import('./main.js');
