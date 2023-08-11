using TgBackend.Model;

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
            var ems = "81444F57";
            
            var rawUrl = $"https://{city}.kdmid.ru/queue/orderinfo.aspx?id={id}&cd={cd}&ems={ems}";

            var embassyRecord = new EmbassyRecord(rawUrl);

            Assert.Equal(city, embassyRecord.City, StringComparer.OrdinalIgnoreCase);
            Assert.Equal(id, embassyRecord.Id, StringComparer.OrdinalIgnoreCase);
            Assert.Equal(cd, embassyRecord.Code, StringComparer.OrdinalIgnoreCase);
            Assert.Equal(ems, embassyRecord.Ems, StringComparer.OrdinalIgnoreCase);
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

            Assert.Equal(id, embassyRecord.Id, StringComparer.OrdinalIgnoreCase);
            Assert.Equal(cd, embassyRecord.Code, StringComparer.OrdinalIgnoreCase);
            Assert.Equal(string.Empty, embassyRecord.Ems, StringComparer.OrdinalIgnoreCase);
        }
    }
}