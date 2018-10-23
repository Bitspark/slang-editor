import '../styles/index.scss';
import {AppComponent} from "./components/app";

const app = new AppComponent('app', 'http://localhost:5149/');
app.start();