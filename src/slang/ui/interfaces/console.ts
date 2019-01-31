import m, {ClassComponent} from "mithril";

import {SlangType, SlangTypeDef} from "../../core/definitions/type";
import {Tk} from "../components/toolkit";

export interface ConsoleValueType<T> {
	typeDef: SlangTypeDef;
	input?: InputValueType<T>;
	output?: OutputValueType<T>;
}

export interface IInputValueTypeAttrs<T> extends Tk.InputAttrs<T> {
}

export abstract class InputValueType<T> implements Tk.Input<T> {
	public abstract view(vnode: m.CVnode<IInputValueTypeAttrs<T>>): m.Children | void | null;
}

export interface IOutputValueTypeAttrs<T> {
	value: T;
	type: SlangType;
}

export abstract class OutputValueType<T> implements ClassComponent<IOutputValueTypeAttrs<T>> {
	public oncreate?(_vnode: m.CVnodeDOM<IOutputValueTypeAttrs<T>>): any {
	}

	public onupdate?(_vnode: m.CVnodeDOM<IOutputValueTypeAttrs<T>>): any {
	}

	public abstract view(vnode: m.CVnode<IOutputValueTypeAttrs<T>>): m.Children | void | null;
}
