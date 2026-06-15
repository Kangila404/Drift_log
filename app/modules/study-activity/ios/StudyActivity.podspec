require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'expo-module.config.json')))

Pod::Spec.new do |s|
  s.name           = 'StudyActivity'
  s.version        = '1.0.0'
  s.summary        = 'Study Live Activity bridge'
  s.description    = 'ActivityKit bridge for DriftLog study mode'
  s.author         = 'kangila'
  s.homepage       = 'https://driftlog.kro.kr'
  s.platforms      = { :ios => '16.2' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end