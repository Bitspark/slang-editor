/* tslint:disable:no-circular-imports */

import {Subscription} from "rxjs";
import {SlangType} from "../../definitions/type";
import {PortModel} from "../models/abstract/port";
import {StreamType} from "./stream-type";

export interface IStreamType {

	getStreamDepth(): number;

	hasPlaceholderAncestor(): boolean;

	subscribeNestingChanged(cb: () => void): Subscription;

}

// tslint:disable-next-line
export interface IStreamPortOwner {

}

export interface IStreamPort {

	initialize(): void;

	createGenericType(other: PortModel): { type: SlangType, portId: string[] };

	getStreamType(): IStreamType;

	subscribeRefreshStreamType(cb: (streamType: IStreamType | null) => void): Subscription;

	subscribeStreamTypeChanged(cb: (streamType: StreamType | null) => void): Subscription;

}
