using TgBackend.Model;
using FluentAssertions;
using FluentAssertions.Execution;

namespace TgBackendTests
{
    public class EmbassyRecordTests
    {
        [Fact]
        public void UrlParsingTest()
        {
            var city = "mycity";
            var id = "12345";
            var cd = "82e1cdf6";
            var ems = "81444f57";
            
            var rawUrl = $"https://{city}.kdmid.ru/queue/orderinfo.aspx?id={id}&cd={cd}&ems={ems}";

            var embassyRecord = new EmbassyRecord(rawUrl);

            using var scope = new AssertionScope();
            embassyRecord.Added.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
            embassyRecord.City.Should().Be(city);
            embassyRecord.Id.Should().Be(id);
            embassyRecord.Code.Should().Be(cd);
            embassyRecord.Ems.Should().Be(ems);
        }

        [Theory]
        [InlineData("https://city.kdmid.ru/queue/orderinfo.aspx?id={0}&cd={1}&ems=")]
        [InlineData("https://city.kdmid.ru/queue/orderinfo.aspx?id={0}&cd={1}")]
        [InlineData("https://city.kdmid.ru/queue/orderinfo.aspx?id={0}&cd={1}&")]
        public void UrlParsingTestEmptyEms(string format)
        {
            var id = "12345";
            var cd = "82e1cdf6";

            var rawUrl = string.Format(format, id, cd);

            var embassyRecord = new EmbassyRecord(rawUrl);

            using var scope = new AssertionScope();
            embassyRecord.Id.Should().Be(id);
            embassyRecord.Code.Should().Be(cd);
            embassyRecord.Ems.Should().BeEmpty();
        }
    }
}