import {BehaviorSubject, Subject} from "rxjs";

export enum BlueprintType {
    Local,
    Elementary,
    Library
}

export class BlueprintModel {

    // Topics
    private removed = new Subject<void>();
    private selected = new BehaviorSubject<boolean>(false);
    private opened = new BehaviorSubject<boolean>(false);

    private readonly hierarchy: Array<string> = [];

    constructor(private fullName: string, private type: BlueprintType) {
        this.hierarchy = fullName.split('.');
    }

    public getFullName(): string {
        return this.fullName;
    }

    public getPackageName(level: number): string {
        return this.hierarchy[level];
    }

    public getPackageDepth(): number {
        return this.hierarchy.length;
    }

    public getShortName(): string {
        return this.hierarchy[this.hierarchy.length - 1];
    }

    public isSelected(): boolean {
        return this.selected.getValue();
    }

    public getType(): BlueprintType {
        return this.type;
    }

    // Actions

    public select() {
        if (!this.selected.getValue()) {
            this.selected.next(true);
        }
    }

    public deselect() {
        if (this.selected.getValue()) {
            this.selected.next(false);
        }
    }

    public delete() {
        this.removed.next();
    }
    
    public open() {
        this.opened.next(true);
    }

    // Subscriptions

    public subscribeSelectChanged(cb: (selected: boolean) => void): void {
        this.selected.subscribe(cb);
    }

    public subscribeOpenedChanged(cb: (opened: boolean) => void): void {
        this.opened.subscribe(cb);
    }

    public subscribeDeleted(cb: () => void): void {
        this.removed.subscribe(cb);
    }

}