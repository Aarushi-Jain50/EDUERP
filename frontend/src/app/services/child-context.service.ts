import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { CurrentUserService } from './current-user.service';
import { Student } from '../models/student.model';

@Injectable({
  providedIn: 'root'
})
export class ChildContextService {
  private readonly userService = inject(CurrentUserService);

  readonly currentParent = this.userService.currentParent;
  readonly linkedChildren = this.userService.linkedStudents;
  readonly selectedChild = this.userService.selectedChild;
  readonly selectedChild$: Observable<Student | null> = toObservable(this.selectedChild);

  selectChild(studentId: string): boolean {
    return this.userService.selectChild(studentId);
  }

  switchParent(parentId: string): void {
    this.userService.switchParent(parentId);
  }
}
