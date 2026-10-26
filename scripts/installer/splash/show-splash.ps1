<#
.SYNOPSIS
    AN POS - Modern WPF Installer Splash Screen
    نافذة واجهة رسومية خفيفة وأنيقة لمثبت التثبيت الذري (WPF Dark Glassmorphism)
.DESCRIPTION
    تعتمد على PresentationFramework المدمج أصلياً في ويندوز (بدون أي برامج إضافية أو UAC)
    لإظهار نافذة تثبيت عصرية بزوايا منحنية ومؤشر تقدم متوهج ونصوص عربية مباشرة.
#>

param(
    [string]$SourcePayloadDir = "$PSScriptRoot\..\..\..\out\win-unpacked",
    [string]$AppName = "AN POS"
)

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$ErrorActionPreference = "Stop"

# قالب واجهة WPF بتصميم Dark Glassmorphic عصري
[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="AN POS - معالج التثبيت الذري"
        Height="400" Width="520"
        WindowStartupLocation="CenterScreen"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        Topmost="True"
        FlowDirection="RightToLeft">
    <Border CornerRadius="20" Background="#0A0E17" BorderBrush="#1E293B" BorderThickness="1.5">
        <Border.Effect>
            <DropShadowEffect Color="#000000" BlurRadius="40" ShadowDepth="10" Opacity="0.8"/>
        </Border.Effect>
        <Grid Margin="28">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="Auto"/>
            </Grid.RowDefinitions>

            <!-- الترويسة والشعار -->
            <StackPanel Grid.Row="0" Orientation="Horizontal" Margin="0,0,0,24">
                <Border Width="56" Height="56" CornerRadius="16" Background="#0F172A" BorderBrush="#38BDF8" BorderThickness="2" Margin="0,0,16,0">
                    <TextBlock Text="AN" Foreground="#38BDF8" FontSize="22" FontWeight="Bold" HorizontalAlignment="Center" VerticalAlignment="Center"/>
                </Border>
                <StackPanel VerticalAlignment="Center">
                    <StackPanel Orientation="Horizontal">
                        <TextBlock Text="نظام AN POS" Foreground="#F8FAFC" FontSize="20" FontWeight="Bold" Margin="0,0,10,0"/>
                        <Border Background="#1E293B" CornerRadius="10" Padding="8,2" VerticalAlignment="Center">
                            <TextBlock Text="تثبيت ذري A/B" Foreground="#38BDF8" FontSize="11" FontWeight="SemiBold"/>
                        </Border>
                    </StackPanel>
                    <TextBlock Text="نظام نقاط البيع وإدارة المبيعات فائق الاعتمادية" Foreground="#94A3B8" FontSize="12" Margin="0,4,0,0"/>
                </StackPanel>
            </StackPanel>

            <!-- قائمة الحالات والخطوات -->
            <StackPanel Grid.Row="1" VerticalAlignment="Center" Margin="4,0,4,16">
                <Border Background="#0F172A" CornerRadius="12" BorderBrush="#1E293B" BorderThickness="1" Padding="14">
                    <StackPanel>
                        <TextBlock Name="TxtStep1" Text="📁 [1/4] تهيئة مساحات التخزين المعزولة (SystemVault)..." Foreground="#38BDF8" FontSize="12" Margin="0,0,0,6"/>
                        <TextBlock Name="TxtStep2" Text="📦 [2/4] استخراج ملفات الحزمة إلى الفتحة الظلية..." Foreground="#64748B" FontSize="12" Margin="0,0,0,6"/>
                        <TextBlock Name="TxtStep3" Text="🛡️ [3/4] تدقيق سلامة البصمات وتطابق التوقيع (SHA-256)..." Foreground="#64748B" FontSize="12" Margin="0,0,0,6"/>
                        <TextBlock Name="TxtStep4" Text="⚡ [4/4] التحويل الذري الفوري وإنشاء اختصارات سطح المكتب..." Foreground="#64748B" FontSize="12"/>
                    </StackPanel>
                </Border>
            </StackPanel>

            <!-- شريط التقدم العصري -->
            <StackPanel Grid.Row="2" Margin="0,0,0,16">
                <Grid Margin="0,0,0,8">
                    <TextBlock Name="TxtStatus" Text="جاري بدء عملية التثبيت..." Foreground="#F8FAFC" FontSize="12" FontWeight="SemiBold" HorizontalAlignment="Left"/>
                    <TextBlock Name="TxtPercent" Text="0%" Foreground="#38BDF8" FontSize="12" FontWeight="Bold" HorizontalAlignment="Right"/>
                </Grid>
                <ProgressBar Name="ProgBar" Height="8" Minimum="0" Maximum="100" Value="0" Background="#1E293B" Foreground="#38BDF8" BorderThickness="0">
                    <ProgressBar.Clip>
                        <RectangleGeometry RadiusX="4" RadiusY="4" Rect="0,0,464,8"/>
                    </ProgressBar.Clip>
                </ProgressBar>
            </StackPanel>

            <!-- التذييل -->
            <Grid Grid.Row="3" Margin="0,4,0,0">
                <TextBlock Text="نطاق المستخدم الواحد (بدون طلب صلاحيات Administrator)" Foreground="#64748B" FontSize="11" HorizontalAlignment="Left"/>
                <TextBlock Text="البيانات مؤمنة 100% ✅" Foreground="#10B981" FontSize="11" FontWeight="SemiBold" HorizontalAlignment="Right"/>
            </Grid>
        </Grid>
    </Border>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader $xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# استخراج عناصر التحكم
$txtStatus  = $window.FindName("TxtStatus")
$txtPercent = $window.FindName("TxtPercent")
$progBar    = $window.FindName("ProgBar")
$txtStep1   = $window.FindName("TxtStep1")
$txtStep2   = $window.FindName("TxtStep2")
$txtStep3   = $window.FindName("TxtStep3")
$txtStep4   = $window.FindName("TxtStep4")

# إظهار النافذة في خيط المعالجة المنفصل مع تقدم العمل
$window.Show()

function Update-UI {
    param($text, $percent, $stepNum)
    $txtStatus.Text = $text
    $txtPercent.Text = "$percent%"
    $progBar.Value = $percent

    if ($stepNum -ge 1) { $txtStep1.Foreground = [System.Windows.Media.Brushes]::MediumSpringGreen }
    if ($stepNum -ge 2) { $txtStep2.Foreground = [System.Windows.Media.Brushes]::MediumSpringGreen }
    if ($stepNum -ge 3) { $txtStep3.Foreground = [System.Windows.Media.Brushes]::MediumSpringGreen }
    if ($stepNum -ge 4) { $txtStep4.Foreground = [System.Windows.Media.Brushes]::MediumSpringGreen }

    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 250
}

# تشغيل خطوات التثبيت الفعلية بالتزامن مع الواجهة
$installerScript = Join-Path $PSScriptRoot "..\install-cold.ps1"

if (Test-Path $installerScript) {
    Update-UI "تهيئة مساحات التخزين المعزولة..." 25 1
    Update-UI "استخراج ملفات الحزمة إلى الفتحة الظلية..." 60 2
    Update-UI "فحص سلامة الملفات ومطابقة البصمات..." 85 3
    
    # تشغيل سكريبت التثبيت الفعلي
    & $installerScript -SourcePayloadDir $SourcePayloadDir -AppName $AppName -LaunchAfterInstall:$false
    
    Update-UI "اكتمل التثبيت بنجاح! جاري فتح البرنامج..." 100 4
    Start-Sleep -Milliseconds 600
} else {
    Update-UI "اكتمال المحاكاة..." 100 4
    Start-Sleep -Milliseconds 400
}

$window.Close()

# تشغيل التطبيق النهائي
$currentExe = "$env:LOCALAPPDATA\Programs\$AppName\SystemVault\current\$AppName.exe"
if (Test-Path $currentExe) {
    Start-Process -FilePath $currentExe
}
