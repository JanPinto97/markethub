import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiOrigin}${url}`;
  }
}
