import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('firstInput') firstInput!: ElementRef;

    budgetForm!: FormGroup;
    allMonths: string[] = [];
    months: string[] = [];
    startMonth: string = '';
    endMonth: string = '';
    filteredStartIndex: number = 0;
    filteredEndIndex: number = 12;
    monthIndexes: number[] = [];

    totalIncome: number[] = [];
    totalExpenses: number[] = [];
    profitAndLoss: number[] = [];
    openingBalance: number[] = [];
    closingBalance: number[] = [];

    showContextMenu: boolean = false;
    contextMenuPosition: { x: number, y: number } = { x: 0, y: 0 };

    private selectedCategory?: AbstractControl;
    private selectedValue?: number;
    private destroy$: Subject<void> = new Subject<void>();

    constructor(private formBuilder: FormBuilder, private elementRef: ElementRef) { }

    get incomeCategories(): FormArray {
        return this.budgetForm.get('incomeCategories') as FormArray;
    }

    get expenseCategories(): FormArray {
        return this.budgetForm.get('expenseCategories') as FormArray;
    }

    ngOnInit(): void {
        this.initializeForm();
        this.initializeMonths();

        this.addCategory('income');
        this.addCategory('expense');

        this.budgetForm.valueChanges.subscribe(() => this.updateTotals());
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.firstInput?.nativeElement.focus();
        }, 300);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    disableArrowKey(event: Event) {
        event.preventDefault();
    }

    applyToAll() {
        if (!this.selectedCategory) return;

        const valuesArray = this.selectedCategory.get('values') as FormArray;
        valuesArray.controls.forEach(control => control.setValue(this.selectedValue));

        this.showContextMenu = false;
    }

    openContextMenu(event: MouseEvent, category: AbstractControl, value: number): void {
        event.preventDefault();
        this.contextMenuPosition = { x: event.clientX, y: event.clientY };
        this.showContextMenu = true;
        this.selectedCategory = category;
        this.selectedValue = value;
    }

    getCategoryGroup(): FormGroup {
        return this.formBuilder.group({
            categoryName: new FormControl(''),
            subCategories: this.formBuilder.array([this.getSubCategoryGroup()]),
        });
    }

    getSubCategoryGroup(): FormGroup {
        return this.formBuilder.group({
            subCategoryName: new FormControl(''),
            values: this.formBuilder.array(this.months.map(() => new FormControl(0))),
        });
    }

    getSubCategories(category: FormGroup): FormArray {
        return category.get('subCategories') as FormArray;
    }

    getSubCategory(subCategory: AbstractControl): FormGroup {
        return subCategory as FormGroup;
    }

    getMonthValues(subCategory: AbstractControl): FormArray {
        return subCategory.get('values') as FormArray;
    }

    addCategory(type: 'income' | 'expense'): void {
        const categoryGroup = this.getCategoryGroup();
        if (type === 'income') {
            this.incomeCategories.push(categoryGroup);
        } else {
            this.expenseCategories.push(categoryGroup);
        }
    }

    addSubCategory(category: AbstractControl): void {
        const subCategories = category.get('subCategories') as FormArray;
        if (subCategories) {
            subCategories.push(this.getSubCategoryGroup());
        }
    }

    calculateSubTotal(values: number[]): number {
        return values.reduce((acc, curr) => acc + curr, 0);
    }

    calculateCategoryTotal(categories: FormArray): number {
        return categories.controls.reduce((acc: number, category: any) => {
            const subCategories = category.get('subCategories') as FormArray;
            return (
                acc +
                subCategories.controls.reduce((subAcc, subCategory: any) => {
                    const values = subCategory.get('values').value.slice(this.filteredStartIndex, this.filteredEndIndex);
                    return subAcc + this.calculateSubTotal(values);
                }, 0)
            );
        }, 0);
    }

    calculateMonthlyTotal(categories: FormArray, monthIndex: number): number {
        if (monthIndex < this.filteredStartIndex || monthIndex >= this.filteredEndIndex) return 0;

        return categories.controls.reduce((total, category: any) => {
            const subCategories = category.get('subCategories') as FormArray;
            return total + subCategories.controls.reduce((subTotal, subCategory: any) => {
                const values = subCategory.get('values').value;
                return subTotal + (values[monthIndex] || 0);
            }, 0);
        }, 0);
    }

    calculateCategorySubTotal(category: FormGroup, monthIndex: number): number {
        const subCategories = this.getSubCategories(category);

        return subCategories.controls.reduce((total, subCategory: any) => {
            const values = this.getMonthValues(subCategory).value;
            return total + (values[monthIndex] || 0);
        }, 0);
    }

    deleteSubCategory(type: 'income' | 'expense', parentIndex: number, subIndex: number): void {
        const categories = type === 'income' ? this.incomeCategories : this.expenseCategories;
        const parentCategory = categories.at(parentIndex) as FormGroup;
        const subCategories = parentCategory.get('subCategories') as FormArray;

        if (subCategories) {
            subCategories.removeAt(subIndex);

            if (subCategories.length === 0) {
                categories.removeAt(parentIndex);
            }
        }
    }

    updateMonthFilter(): void {
        this.filteredStartIndex = this.allMonths.indexOf(this.startMonth);
        this.filteredEndIndex = this.allMonths.indexOf(this.endMonth) + 1;
        this.months = this.allMonths.slice(this.filteredStartIndex, this.filteredEndIndex);
        this.monthIndexes = this.months.map((_, i) => i + this.filteredStartIndex);

        this.updateValuesArray(this.incomeCategories);
        this.updateValuesArray(this.expenseCategories);
    }

    private updateTotals(): void {
        for (let monthIndex = 0; monthIndex < this.months.length; monthIndex++) {
            this.totalIncome[monthIndex] = this.calculateMonthlyTotal(this.incomeCategories, monthIndex);
            this.totalExpenses[monthIndex] = this.calculateMonthlyTotal(this.expenseCategories, monthIndex);
            this.profitAndLoss[monthIndex] = this.totalIncome[monthIndex] - this.totalExpenses[monthIndex];

            this.openingBalance[monthIndex] = monthIndex === 0 ? 0 : this.closingBalance[monthIndex - 1];
            this.closingBalance[monthIndex] = this.openingBalance[monthIndex] + this.profitAndLoss[monthIndex];
        }
    }

    private updateValuesArray(categories: FormArray): void {
        categories.controls.forEach((category: any) => {
            const subCategories = category.get('subCategories') as FormArray;
            subCategories.controls.forEach((subCategory: any) => {
                const values = subCategory.get('values') as FormArray;
                while (values.length < this.months.length) {
                    values.push(new FormControl(0));
                }
                while (values.length > this.months.length) {
                    values.removeAt(values.length - 1);
                }
            });
        });
    }

    private initializeForm(): void {
        this.budgetForm = this.formBuilder.group({
            incomeCategories: this.formBuilder.array([]),
            expenseCategories: this.formBuilder.array([])
        });
    }

    private initializeMonths(): void {
        this.allMonths = Array.from({ length: 12 }, (_, i) =>
            new Date(2024, i).toLocaleString('default', { month: 'long' })
        );
        this.startMonth = this.allMonths[0];
        this.endMonth = this.allMonths[this.allMonths.length - 1];
        this.updateMonthFilter();
        this.initializeTotalAmount();
    }

    private initializeTotalAmount(): void {
        this.totalIncome = Array(this.allMonths.length).fill(0);
        this.totalExpenses = Array(this.allMonths.length).fill(0);
        this.profitAndLoss = Array(this.allMonths.length).fill(0);
        this.openingBalance = Array(this.allMonths.length).fill(0);
        this.closingBalance = Array(this.allMonths.length).fill(0);
    }
}
