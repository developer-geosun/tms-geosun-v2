import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services';
import { ConfigService } from '../../core/services/config.service';
import { SocialIconComponent } from '../../shared/components/social-icon/social-icon.component';

/**
 * Компонент футера
 */
@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, TranslateModule, SocialIconComponent]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  readonly configService = inject(ConfigService);
  readonly authService = inject(AuthService);
}

