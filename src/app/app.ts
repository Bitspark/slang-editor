import '../styles/index.scss';
import 'jointjs/css/layout.css';
import {AppComponent} from "./components/app";

const app = new AppComponent('app', 'http://localhost:5149/');
app.start();

window.addEventListener('resize', function () {
    app.resize();
});

window.addEventListener('load', function () {
    app.resize();
});