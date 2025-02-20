import { Directive, ElementRef, Renderer2, OnInit, Input, OnDestroy, HostBinding, HostListener, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { NgModel, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomValidators } from '../validators/ngmodel.validator';

@Directive({ selector: '[input-safe]' })
export class InputRequiredDirective implements OnInit, AfterViewInit, OnChanges, OnDestroy {

    parent: HTMLElement;
    superParent: HTMLElement;
    divErrors: any;
    subscription: Subscription;
    mat_hint: any;
    tagName: string;
    asteriskAdded = false;

    //'required' | 'min-x' | 'max-x' | 'email'    
    @Input() required: boolean = true;
    @Input() validations: string[] = [];
    @Input() asterisk: boolean = true;
    @Input() sanitizer: boolean = true;
    @Input() skipUnsafeCharacters: string[] = [];
    @Input() typeAutocomplete: boolean = true;
    @Input() isDropdown: boolean = false;
    @Input() changeRuntime: boolean = false;

    private unsafeCharacters: Map<string, RegExp> = new Map();

    constructor(
        private el: ElementRef,
        private ngModel: NgModel,
        private render: Renderer2) {

        this.initUnsafeCharacters();
        this.configParentSuperParent();
        this.createDivCounter();
    }

    initUnsafeCharacters() {
        this.unsafeCharacters.set("<", /\</g);
        this.unsafeCharacters.set(">", /\>/g);
        // this.unsafeCharacters.set("/", /\//g);
        this.unsafeCharacters.set("\\", /\\/g);
        this.unsafeCharacters.set("'", /\'/g);
        this.unsafeCharacters.set("\"", /\"/g);
        this.unsafeCharacters.set("=", /\=/g);
    }

    ngAfterViewInit() {
        this.initValidators();
        this.createDivErrors();

        this.skipUnsafeCharacters?.forEach(c => this.unsafeCharacters.delete(c));
    }

    ngOnInit() {
        if (this.sanitizer) {
            this.subscription = this.ngModel.valueChanges.subscribe(response => {
                if (response && typeof response == 'string') {
                    //let safeValue = String(response).trimStart().replace(/\</g, '').replace(/\>/g, '').replace(/\//g, '').replace(/\\/g, '').replace(/\'/g, '').replace(/\"/g, '').replace(/\=/g, '');
                    let safeValue = String(response).trimStart();
                    this.unsafeCharacters.forEach(m => safeValue = safeValue.replace(m, ''));
                    if (safeValue != response) {
                        //this.ngModel.reset(safeValue);
                        this.ngModel.control.setValue(safeValue, { emitEvent: false });
                    }
                }
            });
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        // if (this.changeRuntime) {
        this.initValidators();
        setTimeout(() => { this.ngModel.control.updateValueAndValidity(); });
        //}
    }

    private initValidators() {
        this.ngModel.control.setValidators(CustomValidators.createListValidators(this.required, this.validations, this.el));

        this.render.addClass(this.el.nativeElement, 'form-control');

        if (this.typeAutocomplete) {
            (<HTMLElement>this.el.nativeElement).setAttribute('autocomplete', 'off');
            (<HTMLElement>this.el.nativeElement).setAttribute('type', 'text');
        }

        if (this.required) this.addAsterisk();
        else this.removeAsterisk();
    }

    @HostBinding('class.is-invalid') get onTouch() {
        return this.ngModel.touched && !this.ngModel.disabled && this.ngModel.invalid;
    }

    @HostListener('focus', ['$event.target'])
    @HostListener('blur', ['$event.target'])
    @HostListener('keyup', ['$event.target'])
    onEvent(target: HTMLElement) {
        this.ngModel.control.updateValueAndValidity();

        this.showCounterCharacteres();

        if (this.ngModel.disabled) return;

        if (this.ngModel.invalid) {
            this.render.addClass(target, 'is-invalid');

            if (this.parent.classList.contains('input-icon') || this.parent.classList.contains('input-group')) {
                this.render.addClass(this.superParent, 'validated');
            }

            if (this.ngModel.errors['required'] && !this.isDropdown)
                this.render.setProperty(this.divErrors, 'innerHTML', `Campo requerido`);

            if (this.ngModel.errors['minlength']) {
                const minLength = this.ngModel.errors['minlength'].requiredLength;
                this.render.setProperty(this.divErrors, 'innerHTML', `Mínimo ${minLength} caracteres`);
            }

            if (this.ngModel.errors['maxlength']) {
                const minLength = this.ngModel.errors['maxlength'].requiredLength;
                this.render.setProperty(this.divErrors, 'innerHTML', `Máximo ${minLength} caracteres`);
            }

            if (this.ngModel.errors['email'])
                this.render.setProperty(this.divErrors, 'innerHTML', `Debe ingresar un correo electrónico`);

            if (this.ngModel.errors['decimal'])
                this.render.setProperty(this.divErrors, 'innerHTML', `Debe ingresar un número decimal correcto. Ejm: 5.00`);

            if (this.ngModel.errors['secure'])
                this.render.setProperty(this.divErrors, 'innerHTML', `Debe contener mayúsculas, minúsculas, números y/o caracteres especiales`);

            if (this.ngModel.errors['zero'])
                this.render.setProperty(this.divErrors, 'innerHTML', `Debe ingresar un número mayor que 0`);

            if (this.ngModel.errors['lessHundred'])
                this.render.setProperty(this.divErrors, 'innerHTML', `Debe ingresar un número no mayor a 100`);

            if (this.ngModel.errors['monto'])
                this.render.setProperty(this.divErrors, 'innerHTML', `Debe ser un monto válido`);

        } else {
            this.render.removeClass(target, 'is-invalid');

            if (this.parent.classList.contains('input-icon') || this.parent.classList.contains('input-group')) {
                this.render.removeClass(this.superParent, 'validated');
            }
        }
    }

    private configParentSuperParent() {
        this.parent = this.render.parentNode(this.el.nativeElement) as HTMLElement;
        if (this.parent.classList.contains('input-icon') || this.parent.classList.contains('input-group')) this.superParent = this.parent.parentElement;
    }

    private showCounterCharacteres() {
        if (this.tagName != 'TEXTAREA') return;

        let currentLength = this.ngModel.value ? this.ngModel.value.length : 0;
        let maxLength = (<HTMLElement>this.el.nativeElement).getAttribute('maxlength');
        this.render.setProperty(this.mat_hint, 'innerHTML', `${currentLength} / ${maxLength}`);
    }

    private getLabel(): ChildNode {
        if (this.parent.classList.contains('form-group')){
            return this.parent.firstChild;
        }else if (this.parent.classList.contains('input-icon') || this.parent.classList.contains('input-group')){
            return this.superParent.firstChild;
        }
        return this.superParent.firstChild;
    }

    private addAsterisk() {
        if (!this.asterisk) return;
        if (this.asteriskAdded) return;

        let labelChild: ChildNode = this.getLabel();

        // labelChild.textContent = labelChild.textContent.replace(':', '') + ' ';

        let spanAsterisk = this.render.createElement('span');
        this.render.addClass(spanAsterisk, 'text-danger');
        this.render.setProperty(spanAsterisk, 'innerHTML', '*');

        labelChild.appendChild(spanAsterisk);

        this.asteriskAdded = true;
    }

    private removeAsterisk() {
        let labelChild: ChildNode = this.getLabel();

        labelChild?.childNodes.item(1)?.remove();

        this.asteriskAdded = false;
    }

    private createDivErrors() {
        this.divErrors = this.render.createElement('div');
        this.render.addClass(this.divErrors, 'invalid-feedback');

        this.addDivErrorsToTarget();
    }

    private addDivErrorsToTarget() {
        // const target = this.el.nativeElement as HTMLElement;
        if (this.parent.classList.contains('form-group'))
            this.parent.append(this.divErrors);
        else if (this.parent.classList.contains('input-icon') || this.parent.classList.contains('input-group')) {
            this.superParent.append(this.divErrors);
            this.render.addClass(this.superParent, 'validated');
        }
    }

    private createDivCounter() {
        this.tagName = (<HTMLElement>this.el.nativeElement).tagName;
        if (this.tagName != 'TEXTAREA') return;

        this.render.addClass(this.el.nativeElement, 'txtHint');

        this.mat_hint = this.render.createElement('mat-hint');
        this.render.addClass(this.mat_hint, 'mat-hint');
        this.render.addClass(this.mat_hint, 'label');
        this.render.addClass(this.mat_hint, 'label-primary');
        this.render.addClass(this.mat_hint, 'label-inline');
        this.render.addClass(this.mat_hint, 'label-lg');
        this.render.addClass(this.mat_hint, 'font');
        this.render.addClass(this.mat_hint, 'font-weight-bold');

        const div = this.render.createElement('div');
        this.render.addClass(div, 'w-100');
        this.render.addClass(div, 'text-center');
        this.render.appendChild(div, this.mat_hint);

        const parent = this.render.parentNode(this.el.nativeElement);
        this.render.appendChild(parent, div);
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}