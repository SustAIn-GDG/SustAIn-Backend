class AdaptiveDurationBaselineEstimator {
  constructor(initialAverage = 1.0, alpha = 0.125) {
    this.averageDuration = initialAverage; // seconds
    this.alpha = alpha;                    // smoothing factor for average
  }

  update(currentDuration) {
    const deviation = currentDuration - this.averageDuration;
    this.averageDuration += this.alpha * deviation;
  }  

  getAverage() {
    return this.averageDuration;
  }
}

export default AdaptiveDurationBaselineEstimator