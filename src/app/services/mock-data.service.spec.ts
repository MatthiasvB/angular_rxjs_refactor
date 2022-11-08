import { TestBed } from '@angular/core/testing';

import { ReactiveFluxCacheService } from './mock-data.service';

describe('MockDataService', () => {
  let service: ReactiveFluxCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReactiveFluxCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
