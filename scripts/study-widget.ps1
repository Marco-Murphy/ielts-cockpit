# Windows 桌面学习小窗。只读取当前项目的本地 data/checkins.json。
Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase

$projectRoot = Split-Path -Parent $PSScriptRoot
$checkinsFile = Join-Path $projectRoot 'data\checkins.json'
$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="凑企鹅的学习角" Width="380" SizeToContent="Height"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        Topmost="True" ShowInTaskbar="False" ResizeMode="NoResize">
  <Window.Resources>
    <Style TargetType="Button">
      <Setter Property="Background" Value="#F8FAFF"/>
      <Setter Property="Foreground" Value="#56657E"/>
      <Setter Property="BorderThickness" Value="0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value><ControlTemplate TargetType="Button">
          <Border Background="{TemplateBinding Background}" CornerRadius="11">
            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
          </Border>
        </ControlTemplate></Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>
  <Border Background="#FFFDFC" BorderBrush="#D7DDEB" BorderThickness="1" CornerRadius="22" Margin="9" Padding="0">
    <Border.Effect><DropShadowEffect Color="#425071" BlurRadius="24" ShadowDepth="5" Opacity=".19"/></Border.Effect>
    <StackPanel>
      <Border Background="#EAF0FA" CornerRadius="21,21,0,0">
        <Grid Height="134" Margin="11,0,12,0">
          <Grid.ColumnDefinitions><ColumnDefinition Width="110"/><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/><ColumnDefinition Width="Auto"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
          <Image x:Name="PenguinArt" Width="101" Height="129" Grid.Column="0" Stretch="Uniform" VerticalAlignment="Center" IsHitTestVisible="False"/>
          <StackPanel Grid.Column="1" VerticalAlignment="Center">
            <TextBlock x:Name="DragTitle" Text="凑企鹅的学习角" FontFamily="Microsoft YaHei" FontSize="13" FontWeight="Bold" Foreground="#34405D" Cursor="SizeAll"/>
            <TextBlock x:Name="HeaderHint" Text="咕咕嘎嘎 · 接着上次练" FontFamily="Microsoft YaHei" FontSize="9" Foreground="#7886A0" Margin="0,3,0,0"/>
          </StackPanel>
          <Button x:Name="RefreshButton" Grid.Column="2" Content="↻" Width="27" Height="27" Margin="0,0,4,0" FontSize="17" ToolTip="刷新记录"/>
          <Button x:Name="ToggleButton" Grid.Column="3" Content="−" Width="27" Height="27" Margin="0,0,4,0" FontSize="16" ToolTip="收起或展开"/>
          <Button x:Name="CloseButton" Grid.Column="4" Content="×" Width="27" Height="27" FontSize="18" ToolTip="关闭小窗"/>
        </Grid>
      </Border>
      <StackPanel x:Name="WidgetBody" Margin="17,12,17,17">
        <TextBlock x:Name="LastDate" FontFamily="Microsoft YaHei" FontSize="10" Foreground="#7F8AA2" TextWrapping="Wrap" MaxHeight="40" Margin="0,0,0,11"/>
        <TextBlock Text="✦  上次练到" FontFamily="Microsoft YaHei" FontSize="11" FontWeight="Bold" Foreground="#7584AD" Margin="0,0,0,8"/>
        <Border x:Name="ListeningCard" Background="#F2F4FA" CornerRadius="12" Padding="10,8" Margin="0,0,0,7">
          <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="47"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <TextBlock Text="听力" Grid.Column="0" FontFamily="Microsoft YaHei" FontSize="12" Foreground="#79869C"/>
            <StackPanel Grid.Column="1">
              <TextBlock x:Name="ListeningText" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="SemiBold" Foreground="#33415A" TextTrimming="CharacterEllipsis"/>
              <TextBlock x:Name="ListeningDate" FontFamily="Microsoft YaHei" FontSize="10" Margin="0,3,0,0"/>
            </StackPanel>
          </Grid>
        </Border>
        <Border x:Name="ReadingCard" Background="#F2F4FA" CornerRadius="12" Padding="10,8" Margin="0,0,0,14">
          <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="47"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <TextBlock Text="阅读" Grid.Column="0" FontFamily="Microsoft YaHei" FontSize="12" Foreground="#79869C"/>
            <StackPanel Grid.Column="1">
              <TextBlock x:Name="ReadingText" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="SemiBold" Foreground="#33415A" TextTrimming="CharacterEllipsis"/>
              <TextBlock x:Name="ReadingDate" FontFamily="Microsoft YaHei" FontSize="10" Margin="0,3,0,0"/>
            </StackPanel>
          </Grid>
        </Border>
        <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
          <StackPanel>
            <TextBlock Text="本周打卡" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="Bold" Foreground="#34405D"/>
            <TextBlock x:Name="WeekCount" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="Bold" Foreground="#7584AD" Margin="0,4,0,0"/>
          </StackPanel>
          <StackPanel Grid.Column="1">
            <TextBlock Text="连续打卡" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="Bold" Foreground="#34405D"/>
            <TextBlock x:Name="StreakCount" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="Bold" Foreground="#7584AD" Margin="0,4,0,0"/>
          </StackPanel>
        </Grid>
        <StackPanel x:Name="WeekDots" Orientation="Horizontal" Margin="0,10,0,0"/>
      </StackPanel>
    </StackPanel>
  </Border>
</Window>
'@

$window = [Windows.Markup.XamlReader]::Parse($xaml)
$penguinArt = $window.FindName('PenguinArt')
$artPath = Join-Path $PSScriptRoot 'assets\tomori-penguin-v3.png'
$art = [Windows.Media.Imaging.BitmapImage]::new()
$art.BeginInit()
$art.UriSource = [Uri]::new($artPath, [UriKind]::Absolute)
$art.CacheOption = [Windows.Media.Imaging.BitmapCacheOption]::OnLoad
$art.EndInit()
$art.Freeze()
$penguinArt.Source = $art
$dragTitle = $window.FindName('DragTitle')
$headerHint = $window.FindName('HeaderHint')
$refreshButton = $window.FindName('RefreshButton')
$toggleButton = $window.FindName('ToggleButton')
$closeButton = $window.FindName('CloseButton')
$body = $window.FindName('WidgetBody')
$lastDate = $window.FindName('LastDate')
$listeningCard = $window.FindName('ListeningCard')
$listeningText = $window.FindName('ListeningText')
$listeningDate = $window.FindName('ListeningDate')
$readingCard = $window.FindName('ReadingCard')
$readingText = $window.FindName('ReadingText')
$readingDate = $window.FindName('ReadingDate')
$weekCount = $window.FindName('WeekCount')
$streakCount = $window.FindName('StreakCount')
$weekDots = $window.FindName('WeekDots')
$script:collapsed = $false

function Get-Checkins {
  if (-not (Test-Path -LiteralPath $checkinsFile)) { return @() }
  try {
    $raw = Get-Content -LiteralPath $checkinsFile -Raw -Encoding UTF8
    return @((ConvertFrom-Json -InputObject $raw) | Where-Object { $_ -and $_.date })
  } catch { return @() }
}

function Get-LastPractice($records, [string]$kind) {
  $pattern = if ($kind -eq 'listening') { 'section\s*\d+|精听|粗听|听力练习' } else { 'reading\s*\d+|passage\s*\d+|精读|阅读练习' }
  $activityDate = ''
  $progress = $null
  foreach ($record in ($records | Sort-Object date,updatedAt -Descending)) {
    $items = @($record.items)
    [array]::Reverse($items)
    foreach ($item in $items) {
      $parts = @([string]$item -split '[,，;；、]')
      [array]::Reverse($parts)
      foreach ($part in $parts) {
        if ($part -notmatch $pattern) { continue }
        if (-not $activityDate) { $activityDate = [string]$record.date }
        $book = [regex]::Match($part, '(?:剑桥|Cambridge)\s*(\d+)', 'IgnoreCase')
        $test = [regex]::Match($part, 'test\s*[-_ ]*(\d+)', 'IgnoreCase')
        $unitPattern = if ($kind -eq 'listening') { 'section\s*[-_ ]*(\d+)' } else { '(?:reading|passage)\s*[-_ ]*(\d+)' }
        $unit = [regex]::Match($part, $unitPattern, 'IgnoreCase')
        if (-not $progress -and $book.Success -and $test.Success -and $unit.Success) {
          $unitName = if ($kind -eq 'listening') { 'S' } else { 'P' }
          $progress = [pscustomobject]@{ Text = "剑桥$($book.Groups[1].Value) · Test $($test.Groups[1].Value) · $unitName$($unit.Groups[1].Value)"; Date = [string]$record.date }
        }
      }
    }
    if ($activityDate -and $progress) { break }
  }
  return [pscustomobject]@{
    Text = if ($progress) { $progress.Text } elseif ($activityDate) { '尚未记录具体套题' } else { '暂无记录' }
    ActivityDate = $activityDate
    ProgressDate = if ($progress) { $progress.Date } else { '' }
  }
}

function Format-PracticeDate([string]$date, [datetime]$today) {
  if (-not $date) { return '' }
  try {
    $day = [datetime]::ParseExact($date, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
    $daysAgo = [int]($today - $day.Date).TotalDays
    $relative = if ($daysAgo -eq 0) { '今天' } elseif ($daysAgo -eq 1) { '昨天' } elseif ($daysAgo -eq 2) { '前天' } elseif ($daysAgo -gt 2) { "$daysAgo 天前" } else { '未来' }
    return "$relative（$($day.ToString('MM/dd'))）"
  } catch { return $date }
}

function Set-PracticeRow($card, $textBlock, $dateBlock, $practice, [datetime]$today) {
  $textBlock.Text = $practice.Text
  $dateBlock.Text = '还没有这项练习记录'
  $background = '#F2F4FA'
  $dateColor = '#8994A6'
  if ($practice.ActivityDate) {
    try {
      $practiceDay = [datetime]::ParseExact($practice.ActivityDate, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
      $daysAgo = [int]($today - $practiceDay.Date).TotalDays
      if ($daysAgo -eq 0) { $background = '#EAF6F0'; $dateColor = '#37806A' }
      elseif ($daysAgo -eq 1) { $background = '#EEF1FB'; $dateColor = '#6476AC' }
      else { $background = '#F3F3F1'; $dateColor = '#7D8490' }
    } catch {}
  }
  if ($practice.ActivityDate) { $dateBlock.Text = "最近练习  $(Format-PracticeDate $practice.ActivityDate $today)" }
  if ($practice.ProgressDate -and $practice.ProgressDate -ne $practice.ActivityDate) {
    $dateBlock.Text += "`n这套题  $(Format-PracticeDate $practice.ProgressDate $today)"
  }
  $converter = [Windows.Media.BrushConverter]::new()
  $card.Background = $converter.ConvertFromString($background)
  $dateBlock.Foreground = $converter.ConvertFromString($dateColor)
}

function Refresh-Widget {
  $records = @(Get-Checkins)
  $latest = $records | Where-Object { $_.minutes -gt 0 } | Sort-Object date,updatedAt -Descending | Select-Object -First 1
  $lastDate.Text = if ($latest) {
    $items = (@($latest.items) | Where-Object { $_ }) -join ' · '
    if ($items.Length -gt 58) { $items = $items.Substring(0, 58) + '…' }
    "最近打卡  ·  $($latest.date)`n$items"
  } else { '还没有打卡记录' }
  $today = (Get-Date).Date
  Set-PracticeRow $listeningCard $listeningText $listeningDate (Get-LastPractice $records 'listening') $today
  Set-PracticeRow $readingCard $readingText $readingDate (Get-LastPractice $records 'reading') $today
  $monday = $today.AddDays(-(([int]$today.DayOfWeek + 6) % 7))
  $done = @($records | Where-Object { $_.minutes -gt 0 -and $_.date -ge $monday.ToString('yyyy-MM-dd') -and $_.date -le $today.ToString('yyyy-MM-dd') } | Select-Object -ExpandProperty date -Unique)
  $weekCount.Text = "$($done.Count) / 7 天"
  $doneDates = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
  foreach ($record in $records) {
    if ([string]$record.date -match '^\d{4}-\d{2}-\d{2}$' -and $record.date -le $today.ToString('yyyy-MM-dd')) {
      [void]$doneDates.Add([string]$record.date)
    }
  }
  $streakDay = if ($doneDates.Contains($today.ToString('yyyy-MM-dd'))) { $today } else { $today.AddDays(-1) }
  $streak = 0
  while ($doneDates.Contains($streakDay.ToString('yyyy-MM-dd'))) {
    $streak++
    $streakDay = $streakDay.AddDays(-1)
  }
  $streakCount.Text = "$streak 天"
  $headerHint.Text = if ($script:collapsed) { "连${streak}天·周$($done.Count)/7" } else { '咕咕嘎嘎 · 接着上次练' }
  $weekDots.Children.Clear()
  for ($i = 0; $i -lt 7; $i++) {
    $date = $monday.AddDays($i)
    $key = $date.ToString('yyyy-MM-dd')
    $dot = [Windows.Shapes.Ellipse]::new()
    $dot.Width = 12; $dot.Height = 12
    $dot.Margin = [Windows.Thickness]::new(0,0,10,0)
    $color = if ($done -contains $key) { '#8191BC' } elseif ($date -gt $today) { '#DFE4EC' } else { '#F1D7D0' }
    $dot.Fill = ([Windows.Media.BrushConverter]::new()).ConvertFromString($color)
    $dot.ToolTip = "$($date.ToString('MM/dd')) · $(if ($done -contains $key) { '已练习' } elseif ($date -gt $today) { '未到来' } else { '未练习' })"
    [void]$weekDots.Children.Add($dot)
  }
}

$window.Add_PreviewMouseLeftButtonDown({
  param($sender, $eventArgs)
  if ($eventArgs.ClickCount -ne 1) { return }
  # Keep the controls clickable; every other visible part of the card can drag it.
  if ($refreshButton.IsMouseOver -or $toggleButton.IsMouseOver -or $closeButton.IsMouseOver) { return }
  $window.DragMove()
})
$refreshButton.Add_Click({ Refresh-Widget })
$toggleButton.Add_Click({
  $script:collapsed = -not $script:collapsed
  $body.Visibility = if ($script:collapsed) { [Windows.Visibility]::Collapsed } else { [Windows.Visibility]::Visible }
  $window.Width = if ($script:collapsed) { 266 } else { 380 }
  $window.Left = $window.Left + $(if ($script:collapsed) { 114 } else { -114 })
  $dragTitle.Text = if ($script:collapsed) { '凑企鹅' } else { '凑企鹅的学习角' }
  $refreshButton.Visibility = if ($script:collapsed) { [Windows.Visibility]::Collapsed } else { [Windows.Visibility]::Visible }
  $toggleButton.Content = if ($script:collapsed) { '⌄' } else { '−' }
  Refresh-Widget
})
$closeButton.Add_Click({ $window.Close() })
$window.Add_PreviewKeyDown({
  param($sender, $eventArgs)
  if ($eventArgs.Key -eq [Windows.Input.Key]::Escape) { $window.Close() }
})
$window.Add_MouseRightButtonUp({ $window.Close() })
$timer = [Windows.Threading.DispatcherTimer]::new()
$timer.Interval = [TimeSpan]::FromMinutes(1)
$timer.Add_Tick({ Refresh-Widget })
$workArea = [Windows.SystemParameters]::WorkArea
$window.Left = $workArea.Right - 400
$window.Top = $workArea.Top + 85
$timer.Start()
$window.Add_Closed({
  $timer.Stop()
  $window.Dispatcher.BeginInvokeShutdown([Windows.Threading.DispatcherPriority]::Background)
})
Refresh-Widget
$window.Show()
[Windows.Threading.Dispatcher]::Run()
