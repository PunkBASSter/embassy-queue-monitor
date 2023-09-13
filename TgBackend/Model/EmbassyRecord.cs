using System.Text.RegularExpressions;

namespace TgBackend.Model
{
    public class EmbassyRecord
    {
        public EmbassyRecord(string rawUrl)
        {
            var regex = new Regex(@"^https?:\/\/[a-z]*.kdmid.ru\/queue\/orderinfo.aspx\?[a-zA=0-9&]*");
            if (!regex.IsMatch(rawUrl.ToLower()))
                throw new ArgumentException("Invalid URL format.");

            RawUrl = rawUrl.ToLower();
            Url = new Uri(rawUrl, UriKind.Absolute);
            Id = GetUrlParam("id");
            Code = GetUrlParam("cd");
            Ems = GetUrlParam("ems");
            City = RawUrl.Split('.')[0].Split("://")[1];
            Added = DateTime.UtcNow;
        }

        public string RawUrl { get; init; } = "";

        public Uri Url { get; init; }

        //Номер заявки
        public string? Id { get; init; }

        //Защитный код
        public string Code { get; init; }

        //Хз чё такое, но пусть будет
        public string Ems { get; init; }

        public string? City { get; init; }

        public DateTime Added { get; init; }

        private DateTime _completed;
        public DateTime? Completed { get { return _completed; }
            set
            {
                if (value < Added || value is null)
                    throw new ArgumentException("Completion date must be after added date.");

                _completed = value.Value;
            } 
        }

        private string GetUrlParam(string key)
        {
            var par = Url.Query[1..]  //to remove ? mark
                .Split('&').Select(kv => kv.Split('='))
                .ToDictionary(
                    keyvalue => keyvalue[0].ToLower(),
                    keyvalue => keyvalue.Length == 2 ? keyvalue[1].ToLower() : string.Empty);
            par.TryGetValue(key, out var result);

            return result ?? string.Empty;
        }
    }
}
