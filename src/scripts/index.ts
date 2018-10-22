import '../styles/index.scss';
import { Surrounding } from './model.ts';
import { JointComponent } from './canvas.ts';

const sur = new Surrounding();
const jcomp = new JointComponent('myholder', sur);

export function addOperator() {
  sur.addOperator(new Operator());
}
