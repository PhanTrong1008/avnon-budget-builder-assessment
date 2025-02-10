import { Directive, ElementRef, HostListener } from "@angular/core";

@Directive({
    selector: "[appArrowNavigation]",
})
export class ArrowNavigationDirective {
    constructor(private el: ElementRef) { }

    @HostListener("keydown", ["$event"])
    handleKeyDown(event: KeyboardEvent) {
        const allRows = Array.from(document.querySelectorAll("tr"));
        const currentRow = this.el.nativeElement.closest("tr");

        if (!currentRow) return;

        const rowIndex = allRows.indexOf(currentRow);
        const columnIndex = this.findColumnIndex(currentRow, this.el.nativeElement);

        switch (event.key) {
            case "ArrowRight":
                this.moveHorizontally(event, currentRow, 1);
                break;
            case "ArrowLeft":
                this.moveHorizontally(event, currentRow, -1);
                break;
            case "ArrowUp":
                this.moveVertically(event, allRows, rowIndex, columnIndex, -1);
                break;
            case "ArrowDown":
                this.moveVertically(event, allRows, rowIndex, columnIndex, 1);
                break;
            default:
                break;
        }
    }

    private moveHorizontally(event: KeyboardEvent, row: Element, direction: number) {
        event.preventDefault();
        const focusableElements = this.getFocusableElements(row);
        const newIndex = focusableElements.findIndex((el) => el === this.el.nativeElement) + direction;

        if (focusableElements[newIndex]) {
            focusableElements[newIndex].focus();
        }
    }

    private moveVertically(event: KeyboardEvent, rows: Element[], rowIndex: number, columnIndex: number, direction: number) {
        event.preventDefault();
        let newRowIndex = rowIndex + direction;

        // Find util has the component binding next arrow directive
        while (newRowIndex >= 0 && newRowIndex < rows.length) {
            const newRow = rows[newRowIndex];
            const focusableElements = this.getFocusableElements(newRow);

            if (focusableElements[columnIndex]) {
                focusableElements[columnIndex].focus();
                break;
            }

            newRowIndex += direction;
        }
    }

    private getFocusableElements(row: Element): HTMLElement[] {
        return Array.from(row.querySelectorAll("input[appArrowNavigation], button[appArrowNavigation]")) as HTMLElement[];
    }

    private findColumnIndex(row: Element, element: HTMLElement): number {
        return this.getFocusableElements(row).indexOf(element);
    }
}
