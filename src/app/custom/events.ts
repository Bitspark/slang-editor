import {BehaviorSubject, Subject} from 'rxjs';
import {AppModel} from '../model/app';

abstract class BaseSlangSubject<T> {

    protected constructor(protected readonly name: string) {
    }

}

export class EventManager {
    
    constructor(private readonly appModel: AppModel) {
    }
    
}

export class SlangSubject<T> extends BaseSlangSubject<T> {
    private readonly subject = new Subject<T>();

    constructor(name: string) {
        super(name);
    }

    public next(value?: T) {
        this.subject.next(value);
    }

    public subscribe(next: (value?: T) => void) {
        this.subject.subscribe(next);
    }
}

export class SlangBehaviorSubject<T> extends BaseSlangSubject<T> {
    private readonly subject: BehaviorSubject<T>;

    constructor(name: string, initial: T) {
        super(name);
        this.subject = new BehaviorSubject<T>(initial);
    }

    public next(value: T) {
        this.subject.next(value);
    }

    public subscribe(next: (value: T) => void) {
        this.subject.subscribe(next);
    }

    public getValue(): T {
        return this.subject.getValue();
    }
}

export class SlangArrayBehaviorSubject<T> extends BaseSlangSubject<T> {
    private readonly subject = new Subject<T>();

    public nextAdd(value: T) {

    }

    public nextRemove(value: T) {

    }
}
