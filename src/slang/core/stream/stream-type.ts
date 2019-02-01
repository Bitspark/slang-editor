import {Subscription} from "rxjs";
import {PortModel} from "../models/abstract/port";
import {SlangSubject, SlangSubjectTrigger} from "../models/abstract/utils/events";

export function containsMisplacedStreamTypeTo(searchStream: StreamType, stream: StreamType): boolean {
	let baseStream: StreamType | null = searchStream;
	let index = 0;
	while (baseStream !== null) {
		const streamIndex = stream.findStreamType(baseStream);
		if (streamIndex !== -1 && streamIndex !== index) {
			return true;
		}
		baseStream = baseStream.getBaseStreamOrNull();
		index++;
	}
	return false;
}

export class StreamType {

	public static refreshActive = true;

	private static id = 0;

	private readonly id = StreamType.id++;

	private baseStream: StreamType | null = null;

	private readonly nestingChanged = new SlangSubjectTrigger("nesting");

	private readonly startResetStreamTypeRequested = new SlangSubjectTrigger("mark-unreachable");
	private readonly finishResetStreamTypeRequested = new SlangSubject<{ mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger }>("remove-unreachable");

	constructor(baseStream: StreamType | null, private source: PortModel | null) {
		this.setBaseStream(baseStream);
	}

	public getStreamStep(other: StreamType): [StreamType | null, number] {
		if (this === other) {
			return [null, 0];
		}

		if (other.hasAncestor(this)) {
			let last = other;
			let distance = 1;
			while (last.baseStream) {
				if (last.baseStream === this) {
					return [last, distance];
				}
				last = last.baseStream;
				distance++;
			}
			throw new Error(`unexpected inconsistency: StreamType.hasAncestor behaving incorrectly`);
		}

		if (this.hasPlaceholderRoot()) {
			if (other.hasPlaceholderRoot()) {
				if (!containsMisplacedStreamTypeTo(this, other) && !containsMisplacedStreamTypeTo(other, this)) {
					return [null, 0];
				}
				return [null, -1];

			}
			if (this.getStreamDepth() <= other.getStreamDepth()) {
				return [null, 0];
			}
			return [null, other.getStreamDepth() - this.getStreamDepth()];

		}
		if (other.hasPlaceholderRoot()) {
			if (this.getStreamDepth() >= other.getStreamDepth()) {
				return [null, 0];
			}
			return [null, other.getStreamDepth() - this.getStreamDepth()];
		}
		return [null, -1];
	}

	public hasPlaceholderAncestor(): boolean {
		if (!this.source) {
			return true;
		}
		if (!this.baseStream) {
			return false;
		}
		return this.baseStream.hasPlaceholderAncestor();
	}

	public hasFixedAncestor(): boolean {
		if (!!this.source) {
			return true;
		}
		if (!this.baseStream) {
			return false;
		}
		return this.baseStream.hasFixedAncestor();
	}

	public getPlaceholderDepth(): number {
		if (!!this.source) {
			return 0;
		}
		if (!this.baseStream) {
			return -1;
		}
		return this.baseStream.getPlaceholderDepth() + 1;
	}

	public hasPlaceholderRoot(): boolean {
		return this.getRootStream().isPlaceholder();
	}

	public isPlaceholder(): boolean {
		return !this.source;
	}

	public createSubStream(source: PortModel | null): StreamType {
		return new StreamType(this, source);
	}

	public subscribeBaseStream(baseStream: StreamType): void {
		baseStream.subscribeNestingChanged(() => {
			this.nestingChanged.next();
		});

		baseStream.subscribeStartResetStreamType(() => {
			this.startResetStreamType();
		});
		baseStream.subscribeFinishResetStreamType(({mark, repropagate, refresh}) => {
			this.finishResetStreamType(mark, repropagate, refresh);
		});
	}

	public setBaseStream(baseStream: StreamType | null): void {
		if (baseStream) {
			if (baseStream.hasAncestor(this)) {
				throw new Error(`stream circle detected`);
			}

			this.subscribeBaseStream(baseStream);
		}

		this.baseStream = baseStream;
	}

	public getBaseStream(source: PortModel | null): StreamType | null {
		if (!this.baseStream && this.isPlaceholder()) {
			this.setBaseStream(new StreamType(null, source));
			this.nestingChanged.next();
		}
		return this.baseStream;
	}

	public getBaseStreamOrNull(): StreamType | null {
		return this.baseStream;
	}

	public getSource(): PortModel | null {
		return this.source;
	}

	public fixedDepth(start = 0, current = 0): number {
		let sum = start;

		if (!this.isPlaceholder()) {
			sum += Math.pow(2, current);
		}

		if (!this.baseStream) {
			return sum;
		}

		return this.baseStream.fixedDepth(sum, current + 1);
	}

	public getRootStream(): StreamType {
		if (!this.baseStream) {
			return this;
		}
		return this.baseStream.getRootStream();
	}

	public getStreamDepth(): number {
		if (!!this.baseStream) {
			return this.baseStream.getStreamDepth() + 1;
		}
		return 1;
	}

	public resetStreamType() {
		this.getRootStream().resetStreamTypeRoot();
	}

	public subscribeStartResetStreamType(cb: () => void): Subscription {
		return this.startResetStreamTypeRequested.subscribe(cb);
	}

	public subscribeFinishResetStreamType(cb: (value: { mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger }) => void): Subscription {
		return this.finishResetStreamTypeRequested.subscribe(cb);
	}

	public subscribeNestingChanged(cb: () => void): Subscription {
		return this.nestingChanged.subscribe(cb);
	}

	public toString(): string {
		let str = "";
		let baseStream: StreamType | null = this;
		while (baseStream) {
			str = (baseStream.isPlaceholder() ? `PH(${baseStream.id})` : `FX(${baseStream.id})`) + "|" + str;
			baseStream = baseStream.getBaseStreamOrNull();
		}
		return str + `DOM:${this.fixedDepth()}`;
	}

	public findStreamType(stream: StreamType): number {
		if (this === stream) {
			return 0;
		}

		if (this.baseStream) {
			const baseIndex = this.baseStream.findStreamType(stream);
			if (baseIndex === -1) {
				return baseIndex;
			}
			return baseIndex + 1;

		}

		return -1;
	}

	private hasAncestor(stream: StreamType): boolean {
		if (stream === this) {
			return true;
		}
		if (this.baseStream) {
			return this.baseStream.hasAncestor(stream);
		}
		return false;
	}

	private resetStreamTypeRoot() {
		StreamType.refreshActive = false;
		const streamPortOwner = this.source!.getOwner().getStreamPortOwner();
		if (streamPortOwner && streamPortOwner.isStreamSource()) {
			streamPortOwner.setMarkedForReset(true);
		}
		this.startResetStreamType();
		const mark = new SlangSubjectTrigger("mark");
		const repropagate = new SlangSubjectTrigger("repropagate");
		const refresh = new SlangSubjectTrigger("repropagate");
		this.finishResetStreamType(mark, repropagate, refresh);
		mark.next();
		repropagate.next();
		if (streamPortOwner && streamPortOwner.isStreamSource()) {
			streamPortOwner.setBaseStream(new StreamType(null, this.source));
			streamPortOwner.setMarkedForReset(false);
			streamPortOwner.propagateStreamType();
			streamPortOwner.refreshStreamType();
		}
		StreamType.refreshActive = true;
		if (streamPortOwner && streamPortOwner.isStreamSource()) {
			streamPortOwner.refreshStreamType();
		}
		refresh.next();
	}

	private startResetStreamType(): void {
		this.startResetStreamTypeRequested.next();
	}

	private finishResetStreamType(mark: SlangSubjectTrigger, repropagate: SlangSubjectTrigger, refresh: SlangSubjectTrigger): void {
		this.finishResetStreamTypeRequested.next({mark, repropagate, refresh});
	}
}
