import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Компонент логотипу GeoSun
 */
@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class LogoComponent {
}

