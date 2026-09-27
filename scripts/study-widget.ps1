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
        <Grid Height="116" Margin="11,0,12,0">
          <Grid.ColumnDefinitions><ColumnDefinition Width="99"/><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/><ColumnDefinition Width="Auto"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
          <Canvas Width="92" Height="110" Grid.Column="0" VerticalAlignment="Center">
            <!-- Full penguin suit: yellow feet, flippers, round body and beak above the girl's face. -->
            <Path Data="M 28,94 C 18,93 14,103 24,106 L 42,106 L 40,94 Z" Fill="#F5BF69"/>
            <Path Data="M 51,95 L 49,106 L 69,106 C 78,103 74,93 63,94 Z" Fill="#F5BF69"/>
            <Path Data="M 23,53 C 9,50 2,62 2,76 C 11,73 20,70 29,64 Z" Fill="#4B5675"/>
            <Path Data="M 67,53 C 82,50 90,62 90,75 C 79,72 73,69 63,63 Z" Fill="#4B5675"/>
            <Ellipse Width="57" Height="70" Fill="#4B5675" Canvas.Left="17" Canvas.Top="34"/>
            <Ellipse Width="39" Height="51" Fill="#FFF9F3" Canvas.Left="26" Canvas.Top="49"/>
            <Ellipse Width="66" Height="65" Fill="#4B5675" Canvas.Left="13" Canvas.Top="2"/>
            <Ellipse Width="48" Height="35" Fill="#FFF9F3" Canvas.Left="22" Canvas.Top="30"/>
            <Path Data="M 21,42 C 22,31 29,28 43,29 C 57,28 67,34 70,43 C 61,40 59,36 53,38 C 45,37 44,41 38,39 C 29,38 27,43 21,42 Z" Fill="#A2A0B4"/>
            <Ellipse Width="8" Height="10" Fill="#FFF9F3" Canvas.Left="27" Canvas.Top="10"/>
            <Ellipse Width="8" Height="10" Fill="#FFF9F3" Canvas.Left="55" Canvas.Top="10"/>
            <Ellipse Width="3.5" Height="5" Fill="#28364D" Canvas.Left="30" Canvas.Top="13"/>
            <Ellipse Width="3.5" Height="5" Fill="#28364D" Canvas.Left="58" Canvas.Top="13"/>
            <Path Data="M 38,21 Q 46,15 54,21 L 46,30 Z" Fill="#F5BF69"/>
            <Ellipse Width="3.5" Height="5" Fill="#495069" Canvas.Left="34" Canvas.Top="47"/>
            <Ellipse Width="3.5" Height="5" Fill="#495069" Canvas.Left="54" Canvas.Top="47"/>
            <Ellipse Width="8" Height="4" Fill="#F5C5C9" Canvas.Left="25" Canvas.Top="53"/>
            <Ellipse Width="8" Height="4" Fill="#F5C5C9" Canvas.Left="60" Canvas.Top="53"/>
            <Path Data="M 43,54 Q 46,57 49,54" Stroke="#8D7480" StrokeThickness="1.4" Fill="Transparent"/>
            <TextBlock Text="✦" FontSize="13" Foreground="#93A2C3" Canvas.Left="1" Canvas.Top="1"/>
          </Canvas>
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
        <TextBlock x:Name="LastDate" FontFamily="Microsoft YaHei" FontSize="10" Foreground="#7F8AA2" Margin="0,0,0,11"/>
        <TextBlock Text="✦  上次练到" FontFamily="Microsoft YaHei" FontSize="11" FontWeight="Bold" Foreground="#7584AD" Margin="0,0,0,8"/>
        <Border Background="#F2F4FA" CornerRadius="12" Padding="10,8" Margin="0,0,0,7">
          <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="47"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <TextBlock Text="听力" Grid.Column="0" FontFamily="Microsoft YaHei" FontSize="12" Foreground="#79869C"/>
            <TextBlock x:Name="ListeningText" Grid.Column="1" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="SemiBold" Foreground="#33415A" TextTrimming="CharacterEllipsis"/>
          </Grid>
        </Border>
        <Border Background="#F2F4FA" CornerRadius="12" Padding="10,8" Margin="0,0,0,14">
          <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="47"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <TextBlock Text="阅读" Grid.Column="0" FontFamily="Microsoft YaHei" FontSize="12" Foreground="#79869C"/>
            <TextBlock x:Name="ReadingText" Grid.Column="1" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="SemiBold" Foreground="#33415A" TextTrimming="CharacterEllipsis"/>
          </Grid>
        </Border>
        <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
          <TextBlock Text="本周打卡" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="Bold" Foreground="#34405D"/>
          <TextBlock x:Name="WeekCount" Grid.Column="1" FontFamily="Microsoft YaHei" FontSize="12" FontWeight="Bold" Foreground="#7584AD"/>
        </Grid>
        <StackPanel x:Name="WeekDots" Orientation="Horizontal" Margin="0,10,0,0"/>
      </StackPanel>
    </StackPanel>
  </Border>
</Window>
'@

$window = [Windows.Markup.XamlReader]::Parse($xaml)
$dragTitle = $window.FindName('DragTitle')
$headerHint = $window.FindName('HeaderHint')
$refreshButton = $window.FindName('RefreshButton')
$toggleButton = $window.FindName('ToggleButton')
$closeButton = $window.FindName('CloseButton')
$body = $window.FindName('WidgetBody')
$lastDate = $window.FindName('LastDate')
$listeningText = $window.FindName('ListeningText')
$readingText = $window.FindName('ReadingText')
$weekCount = $window.FindName('WeekCount')
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
  $pattern = if ($kind -eq 'listening') { 'section\s*\d+|精听|粗听|听力练习' } else { 'reading\s*\d+|精读|阅读练习' }
  foreach ($record in ($records | Sort-Object date,updatedAt -Descending)) {
    foreach ($item in @($record.items)) {
      foreach ($part in ([string]$item -split '[,，;；、]')) {
        if ($part -notmatch $pattern) { continue }
        $book = [regex]::Match($part, '(?:剑桥|Cambridge)\s*(\d+)', 'IgnoreCase')
        $test = [regex]::Match($part, 'test\s*[-_ ]*(\d+)', 'IgnoreCase')
        $unitPattern = if ($kind -eq 'listening') { 'section\s*[-_ ]*(\d+)' } else { 'reading\s*[-_ ]*(\d+)' }
        $unit = [regex]::Match($part, $unitPattern, 'IgnoreCase')
        if ($book.Success -and $test.Success -and $unit.Success) {
          $unitName = if ($kind -eq 'listening') { 'S' } else { 'P' }
          return "剑桥$($book.Groups[1].Value) · Test $($test.Groups[1].Value) · $unitName$($unit.Groups[1].Value)"
        }
        $clean = $part.Trim()
        if ($clean.Length -gt 27) { $clean = $clean.Substring(0, 27) + '…' }
        if ($clean) { return $clean }
      }
    }
  }
  return '暂无记录'
}

function Refresh-Widget {
  $records = @(Get-Checkins)
  $latest = $records | Where-Object { $_.minutes -gt 0 } | Sort-Object date,updatedAt -Descending | Select-Object -First 1
  $lastDate.Text = if ($latest) { "最近记录  ·  $($latest.date)" } else { '还没有打卡记录' }
  $listeningText.Text = Get-LastPractice $records 'listening'
  $readingText.Text = Get-LastPractice $records 'reading'

  $today = (Get-Date).Date
  $monday = $today.AddDays(-(([int]$today.DayOfWeek + 6) % 7))
  $done = @($records | Where-Object { $_.minutes -gt 0 -and $_.date -ge $monday.ToString('yyyy-MM-dd') -and $_.date -le $today.ToString('yyyy-MM-dd') } | Select-Object -ExpandProperty date -Unique)
  $weekCount.Text = "$($done.Count) / 7 天"
  $headerHint.Text = if ($script:collapsed) { "本周 $($done.Count)/7 天" } else { '咕咕嘎嘎 · 接着上次练' }
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

$dragTitle.Add_MouseLeftButtonDown({ param($sender,$eventArgs) if ($eventArgs.ClickCount -eq 1) { $window.DragMove() } })
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
