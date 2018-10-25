import '../styles/index.scss';
import 'jointjs/css/layout.css';
import {AppComponent} from "./components/app";
import {AppModel} from './model/app';

const appModel = new AppModel();
const app = new AppComponent(appModel, document.getElementById("app")!, 'http://localhost:5149/');
app.start();

window.addEventListener('resize', function () {
    app.resize();
});

window.addEventListener('load', function () {
    app.resize();
});