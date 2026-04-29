import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models/user.model';
import { getInitial, getUsernameColor } from '../../shared/utils/color.utils';

interface ProfileUpdateResponse {
  success: boolean;
  user: User;
}

type ErrorResponse = { message?: string; code?: number };

const BIO_MAX = 200;
const SUCCESS_HIDE_MS = 4000;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  private toastSvc = inject(ToastService);
  private baseUrl = 'http://localhost:3000/api/v1';

  @ViewChild('bioInput') bioInput?: ElementRef<HTMLTextAreaElement>;

  readonly bioMax = BIO_MAX;

  profileForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    bio: [''],
  });

  avatarFile: File | null = null;
  coverFile: File | null = null;
  removeAvatarFlag = false;
  removeCoverFlag = false;

  accountForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  private initialProfile = { username: '', bio: '' };
  private initialEmail = '';

  profileChanged = signal(false);
  accountChanged = signal(false);

  profileSaving = signal(false);
  profileSuccess = signal(false);
  profileUsernameError = signal<string | null>(null);
  profileGenericError = signal<string | null>(null);

  accountSaving = signal(false);
  accountSuccess = signal(false);
  accountEmailError = signal<string | null>(null);

  passwordSaving = signal(false);
  passwordSuccess = signal(false);
  passwordCurrentError = signal<string | null>(null);
  passwordNewError = signal<string | null>(null);
  passwordConfirmError = signal<string | null>(null);

  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);

  avatarPreviewFailed = signal(false);
  coverPreviewFailed = signal(false);

  currentAvatarUrl = signal<string>('');
  currentCoverUrl = signal<string>('');
  usernameValue = signal<string>('');

  initial = computed(() => getInitial(this.usernameValue() || this.initialProfile.username));
  color = computed(() => getUsernameColor(this.usernameValue() || this.initialProfile.username));

  bioLength = signal(0);
  passwordFilled = signal(false);

  passwordReady(): boolean {
    return this.passwordFilled();
  }

  constructor() {
    const user = this.auth.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.hydrateFromUser(user);
    this.wireFormChangeListeners();
  }

  ngAfterViewInit() {
    this.autoResizeBio();
  }

  private hydrateFromUser(user: User) {
    this.initialProfile = {
      username: user.username || '',
      bio: user.bio || '',
    };
    this.initialEmail = user.email || '';

    this.profileForm.patchValue(this.initialProfile, { emitEvent: false });
    this.accountForm.patchValue({ email: this.initialEmail }, { emitEvent: false });

    const avatarUrl = user.avatar || '';
    this.currentAvatarUrl.set(avatarUrl.startsWith('/uploads') ? `http://localhost:3000${avatarUrl}` : avatarUrl);
    const coverUrl = user.coverImage || '';
    this.currentCoverUrl.set(coverUrl.startsWith('/uploads') ? `http://localhost:3000${coverUrl}` : coverUrl);
    this.usernameValue.set(this.initialProfile.username);
    this.bioLength.set(this.initialProfile.bio.length);
    this.avatarFile = null;
    this.coverFile = null;
    this.removeAvatarFlag = false;
    this.removeCoverFlag = false;
  }

  private wireFormChangeListeners() {
    this.profileForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v => {
      this.profileChanged.set(
        (v.username ?? '') !== this.initialProfile.username ||
        (v.bio ?? '') !== this.initialProfile.bio ||
        !!this.avatarFile || !!this.coverFile ||
        this.removeAvatarFlag || this.removeCoverFlag
      );
      this.profileSuccess.set(false);
      this.profileUsernameError.set(null);
      this.profileGenericError.set(null);

      this.usernameValue.set(((v.username ?? '') as string).trim());
      this.bioLength.set(((v.bio ?? '') as string).length);
      queueMicrotask(() => this.autoResizeBio());
    });

    this.accountForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v => {
      this.accountChanged.set((v.email ?? '').toLowerCase().trim() !== this.initialEmail.toLowerCase().trim());
      this.accountSuccess.set(false);
      this.accountEmailError.set(null);
    });

    this.passwordForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v => {
      this.passwordFilled.set(!!v.currentPassword && !!v.newPassword && !!v.confirmPassword);
      this.passwordSuccess.set(false);
      this.passwordCurrentError.set(null);
      this.passwordNewError.set(null);
      this.passwordConfirmError.set(null);
    });
  }

  private autoResizeBio() {
    const el = this.bioInput?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  // ── Previews ──

  onAvatarImgError() {
    this.avatarPreviewFailed.set(true);
  }

  onCoverImgError() {
    this.coverPreviewFailed.set(true);
  }

  showAvatarImage(): boolean {
    return !!this.currentAvatarUrl() && !this.avatarPreviewFailed();
  }

  showCoverImage(): boolean {
    return !!this.currentCoverUrl() && !this.coverPreviewFailed();
  }

  onAvatarFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile = file;
    this.removeAvatarFlag = false;
    this.currentAvatarUrl.set(URL.createObjectURL(file));
    this.avatarPreviewFailed.set(false);
    this.markProfileChanged();
  }

  onCoverFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.coverFile = file;
    this.removeCoverFlag = false;
    this.currentCoverUrl.set(URL.createObjectURL(file));
    this.coverPreviewFailed.set(false);
    this.markProfileChanged();
  }

  removeAvatar() {
    this.avatarFile = null;
    this.removeAvatarFlag = true;
    this.currentAvatarUrl.set('');
    this.markProfileChanged();
  }

  removeCover() {
    this.coverFile = null;
    this.removeCoverFlag = true;
    this.currentCoverUrl.set('');
    this.markProfileChanged();
  }

  private markProfileChanged() {
    this.profileChanged.set(true);
    this.profileSuccess.set(false);
  }

  // ── Password visibility ──

  toggleShowCurrent() { this.showCurrent.update(v => !v); }
  toggleShowNew() { this.showNew.update(v => !v); }
  toggleShowConfirm() { this.showConfirm.update(v => !v); }

  // ── Submit handlers ──

  saveProfile() {
    if (this.profileSaving() || !this.profileChanged()) return;

    const usernameCtrl = this.profileForm.get('username');
    if (usernameCtrl?.invalid) {
      const errs = usernameCtrl.errors || {};
      if (errs['required']) this.profileUsernameError.set('Username is required');
      else if (errs['minlength'] || errs['maxlength']) this.profileUsernameError.set('Username must be 3-30 characters');
      else this.profileUsernameError.set('Invalid username');
      return;
    }
    this.profileSaving.set(true);
    this.profileUsernameError.set(null);
    this.profileGenericError.set(null);

    const formData = new FormData();
    formData.append('username', (this.profileForm.value.username ?? '').trim());
    formData.append('bio', this.profileForm.value.bio ?? '');
    if (this.avatarFile) {
      formData.append('avatar', this.avatarFile);
    } else if (this.removeAvatarFlag) {
      formData.append('avatar', '');
    }
    if (this.coverFile) {
      formData.append('coverImage', this.coverFile);
    } else if (this.removeCoverFlag) {
      formData.append('coverImage', '');
    }

    this.http
      .put<ProfileUpdateResponse>(`${this.baseUrl}/profile`, formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.auth.updateCurrentUser(res.user);
          this.hydrateFromUser(res.user);
          this.profileChanged.set(false);
          this.profileSaving.set(false);
          this.profileSuccess.set(true);
          this.toastSvc.show('Profile saved', 'success');
          setTimeout(() => this.profileSuccess.set(false), SUCCESS_HIDE_MS);
        },
        error: (err: HttpErrorResponse) => {
          this.profileSaving.set(false);
          const body = (err.error as ErrorResponse) || {};
          if (err.status === 409) {
            this.profileUsernameError.set(body.message || 'Username already taken');
          } else if (err.status === 400) {
            this.profileGenericError.set(body.message || 'Invalid data');
          } else {
            this.profileGenericError.set(body.message || 'Could not save profile');
          }
        },
      });
  }

  saveAccount() {
    if (this.accountSaving() || !this.accountChanged()) return;

    const emailCtrl = this.accountForm.get('email');
    if (emailCtrl?.invalid) {
      const errs = emailCtrl.errors || {};
      if (errs['required']) this.accountEmailError.set('Email is required');
      else this.accountEmailError.set('Invalid email format');
      return;
    }

    this.accountSaving.set(true);
    this.accountEmailError.set(null);

    const email = ((this.accountForm.value.email as string) || '').trim();

    this.http
      .put<ProfileUpdateResponse>(`${this.baseUrl}/profile`, { email })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.auth.updateCurrentUser(res.user);
          this.initialEmail = res.user.email || email;
          this.accountForm.patchValue({ email: this.initialEmail }, { emitEvent: false });
          this.accountChanged.set(false);
          this.accountSaving.set(false);
          this.accountSuccess.set(true);
          this.toastSvc.show('Email updated', 'success');
          setTimeout(() => this.accountSuccess.set(false), SUCCESS_HIDE_MS);
        },
        error: (err: HttpErrorResponse) => {
          this.accountSaving.set(false);
          const body = (err.error as ErrorResponse) || {};
          if (err.status === 409) {
            this.accountEmailError.set(body.message || 'Email already taken');
          } else if (err.status === 400) {
            this.accountEmailError.set(body.message || 'Invalid email');
          } else {
            this.accountEmailError.set(body.message || 'Could not save email');
          }
        },
      });
  }

  updatePassword() {
    if (this.passwordSaving() || !this.passwordReady()) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    this.passwordCurrentError.set(null);
    this.passwordNewError.set(null);
    this.passwordConfirmError.set(null);

    if ((newPassword as string).length < 8) {
      this.passwordNewError.set('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordConfirmError.set('Passwords do not match');
      return;
    }

    this.passwordSaving.set(true);

    this.http
      .put<{ success: boolean; message: string }>(`${this.baseUrl}/profile/password`, {
        currentPassword,
        newPassword,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
          this.showCurrent.set(false);
          this.showNew.set(false);
          this.showConfirm.set(false);
          this.passwordSaving.set(false);
          this.passwordSuccess.set(true);
          this.toastSvc.show('Password updated', 'success');
          setTimeout(() => this.passwordSuccess.set(false), SUCCESS_HIDE_MS);
        },
        error: (err: HttpErrorResponse) => {
          this.passwordSaving.set(false);
          const body = (err.error as ErrorResponse) || {};
          if (err.status === 401) {
            this.passwordCurrentError.set(body.message || 'Current password is incorrect');
          } else if (err.status === 400) {
            this.passwordNewError.set(body.message || 'Invalid new password');
          } else {
            this.passwordCurrentError.set(body.message || 'Could not update password');
          }
        },
      });
  }
}
