import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './ThemeProvider';

if (window.location.search === '?affiliate') {
  location.href='https://flosports.sjv.io/c/6198276/2930336/24751';
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <ThemeProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  );
}