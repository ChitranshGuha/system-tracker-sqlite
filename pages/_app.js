import '../styles/globals.css';
import { Provider } from 'react-redux';
import store from '../redux/store';
import AppWrapper from '../components/AppWrapper';

function MyApp({ Component, pageProps }) {
  return (
    <AppWrapper>
      <Provider store={store}>
        <Component {...pageProps} />
      </Provider>
    </AppWrapper>
  );
}

export default MyApp;
