import '../styles/index.scss';
import {Operator, Surrounding} from './model';
import {JointComponent} from './canvas';

const sur = new Surrounding();
const jcomp = new JointComponent('myholder', sur);


export function addOperator() {
    sur.addOperator(new Operator());
}

document.getElementById('sl-btn-op-add').addEventListener('click', () => {
    addOperator();
});